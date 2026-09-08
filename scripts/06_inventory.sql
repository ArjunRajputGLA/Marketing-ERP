-- =====================================================================
-- File   : 06_inventory.sql
-- Purpose: Append-only inventory ledger + stock reconciliation
-- Note   : inventory_movements is the authoritative record of stock.
--          erp.products.stock_on_hand is only a cache of it.
--          The table rejects UPDATE and DELETE; corrections are made by
--          posting a reversing movement, which keeps the audit trail intact.
-- =====================================================================

CREATE TABLE IF NOT EXISTS erp.inventory_movements (
    movement_id     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id      BIGINT        NOT NULL REFERENCES erp.products(product_id),
    warehouse_id    SMALLINT      REFERENCES erp.warehouses(warehouse_id),
    movement_type   TEXT          NOT NULL
                                  CHECK (movement_type IN ('OPENING',
                                                           'PURCHASE_IN',  'SALE_OUT',
                                                           'RETURN_IN',    'RETURN_OUT',
                                                           'ADJUSTMENT_IN','ADJUSTMENT_OUT',
                                                           'DAMAGE_OUT')),
    quantity        NUMERIC(14,3) NOT NULL CHECK (quantity > 0),

    -- Direction is derived, never entered. Removes a whole class of sign bugs.
    signed_quantity NUMERIC(14,3) GENERATED ALWAYS AS (
        CASE
            WHEN movement_type IN ('OPENING', 'PURCHASE_IN', 'RETURN_IN', 'ADJUSTMENT_IN')
                THEN quantity
            ELSE -quantity
        END
    ) STORED,

    unit_cost       NUMERIC(14,2) CHECK (unit_cost >= 0),
    movement_date   DATE          NOT NULL DEFAULT CURRENT_DATE,

    -- Provenance: which document caused this movement
    reference_type  TEXT          CHECK (reference_type IN ('SALES_INVOICE', 'PURCHASE_INVOICE',
                                                            'MANUAL_ADJUSTMENT', 'OPENING_BALANCE',
                                                            'SYNTHETIC_EVENT')),
    reference_id    BIGINT,
    notes           TEXT,
    created_by      BIGINT        REFERENCES erp.users(user_id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invmov_product   ON erp.inventory_movements(product_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_invmov_date      ON erp.inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_invmov_type      ON erp.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_invmov_reference ON erp.inventory_movements(reference_type, reference_id);

DROP TRIGGER IF EXISTS trg_invmov_append_only ON erp.inventory_movements;
CREATE TRIGGER trg_invmov_append_only
    BEFORE UPDATE OR DELETE ON erp.inventory_movements
    FOR EACH ROW EXECUTE FUNCTION erp.forbid_update_delete();

COMMENT ON TABLE erp.inventory_movements IS 'Append-only stock ledger. Source of truth for all inventory questions. UPDATE/DELETE are blocked by trigger.';

-- ---------------------------------------------------------------------
-- Keep erp.products.stock_on_hand in step with the ledger
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.apply_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE erp.products
       SET stock_on_hand = stock_on_hand + NEW.signed_quantity
     WHERE product_id = NEW.product_id;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_invmov_apply_stock ON erp.inventory_movements;
CREATE TRIGGER trg_invmov_apply_stock
    AFTER INSERT ON erp.inventory_movements
    FOR EACH ROW EXECUTE FUNCTION erp.apply_inventory_movement();

-- ---------------------------------------------------------------------
-- Rebuild the cache from the ledger.
-- Call with NULL to rebuild every product. Use this as a consistency
-- assertion in your test suite: after a full rebuild, no row should change.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.recalculate_stock_on_hand(p_product_id BIGINT DEFAULT NULL)
RETURNS TABLE (product_id BIGINT, old_stock NUMERIC, new_stock NUMERIC, drift NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ledger AS (
        SELECT m.product_id AS pid, COALESCE(SUM(m.signed_quantity), 0) AS qty
          FROM erp.inventory_movements m
         WHERE p_product_id IS NULL OR m.product_id = p_product_id
         GROUP BY m.product_id
    ),
    target AS (
        SELECT p.product_id AS pid,
               p.stock_on_hand AS old_qty,
               COALESCE(l.qty, 0) AS new_qty
          FROM erp.products p
          LEFT JOIN ledger l ON l.pid = p.product_id
         WHERE p_product_id IS NULL OR p.product_id = p_product_id
    ),
    upd AS (
        UPDATE erp.products p
           SET stock_on_hand = t.new_qty
          FROM target t
         WHERE p.product_id = t.pid
           AND p.stock_on_hand IS DISTINCT FROM t.new_qty
        RETURNING p.product_id
    )
    SELECT t.pid, t.old_qty, t.new_qty, (t.new_qty - t.old_qty)
      FROM target t
     WHERE t.old_qty IS DISTINCT FROM t.new_qty;
END;
$$;

COMMENT ON FUNCTION erp.recalculate_stock_on_hand(BIGINT) IS 'Rebuilds products.stock_on_hand from the ledger and returns any drift found. An empty result set means the cache is consistent.';
