-- =====================================================================
-- File   : 08_business_logic_triggers.sql
-- Purpose: The rules that keep the numbers honest.
--          1. Sales line items snapshot the product cost at sale time
--          2. Invoice headers are recomputed from their line items
--          3. Payment status is recomputed from payments
--          4. Confirming an invoice posts inventory movements
--          5. Cancelling a confirmed invoice posts reversing movements
--          6. Confirming a purchase updates moving-average product cost
--
-- Workflow the application must follow:
--     INSERT header (status DRAFT) -> INSERT items -> UPDATE status='CONFIRMED'
-- Only CONFIRMED documents move stock or appear in reporting views.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Snapshot unit_cost onto sales lines
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.snapshot_sales_item_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.unit_cost IS NULL OR NEW.unit_cost = 0 THEN
        SELECT p.cost_price INTO NEW.unit_cost
          FROM erp.products p
         WHERE p.product_id = NEW.product_id;
        NEW.unit_cost := COALESCE(NEW.unit_cost, 0);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_item_snapshot_cost ON erp.sales_invoice_items;
CREATE TRIGGER trg_sales_item_snapshot_cost
    BEFORE INSERT ON erp.sales_invoice_items
    FOR EACH ROW EXECUTE FUNCTION erp.snapshot_sales_item_cost();

-- ---------------------------------------------------------------------
-- 2 + 3. Recompute a sales invoice header from its items and payments
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.refresh_sales_invoice_state(p_invoice_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_sub  NUMERIC(14,2);
    v_disc NUMERIC(14,2);
    v_tax  NUMERIC(14,2);
    v_tot  NUMERIC(14,2);
    v_cogs NUMERIC(14,2);
    v_paid NUMERIC(14,2);
BEGIN
    SELECT COALESCE(SUM(line_subtotal), 0),
           COALESCE(SUM(line_discount), 0),
           COALESCE(SUM(line_tax),      0),
           COALESCE(SUM(line_total),    0),
           COALESCE(SUM(line_cogs),     0)
      INTO v_sub, v_disc, v_tax, v_tot, v_cogs
      FROM erp.sales_invoice_items
     WHERE sales_invoice_id = p_invoice_id;

    SELECT COALESCE(SUM(amount), 0)
      INTO v_paid
      FROM erp.payments
     WHERE sales_invoice_id = p_invoice_id;

    UPDATE erp.sales_invoices
       SET subtotal        = v_sub,
           discount_amount = v_disc,
           tax_amount      = v_tax,
           total_amount    = v_tot,
           cogs_amount     = v_cogs,
           amount_paid     = v_paid,
           payment_status  = CASE
                                 WHEN v_paid = 0            THEN 'UNPAID'
                                 WHEN v_paid <  v_tot       THEN 'PARTIAL'
                                 WHEN v_paid =  v_tot       THEN 'PAID'
                                 ELSE 'OVERPAID'
                             END
     WHERE sales_invoice_id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION erp.trg_refresh_sales_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM erp.refresh_sales_invoice_state(COALESCE(NEW.sales_invoice_id, OLD.sales_invoice_id));
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_items_refresh ON erp.sales_invoice_items;
CREATE TRIGGER trg_sales_items_refresh
    AFTER INSERT OR UPDATE OR DELETE ON erp.sales_invoice_items
    FOR EACH ROW EXECUTE FUNCTION erp.trg_refresh_sales_from_items();

-- ---------------------------------------------------------------------
-- Purchase equivalent
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.refresh_purchase_invoice_state(p_invoice_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_sub  NUMERIC(14,2);
    v_disc NUMERIC(14,2);
    v_tax  NUMERIC(14,2);
    v_tot  NUMERIC(14,2);
    v_paid NUMERIC(14,2);
BEGIN
    SELECT COALESCE(SUM(line_subtotal), 0),
           COALESCE(SUM(line_discount), 0),
           COALESCE(SUM(line_tax),      0),
           COALESCE(SUM(line_total),    0)
      INTO v_sub, v_disc, v_tax, v_tot
      FROM erp.purchase_invoice_items
     WHERE purchase_invoice_id = p_invoice_id;

    SELECT COALESCE(SUM(amount), 0)
      INTO v_paid
      FROM erp.payments
     WHERE purchase_invoice_id = p_invoice_id;

    UPDATE erp.purchase_invoices
       SET subtotal        = v_sub,
           discount_amount = v_disc,
           tax_amount      = v_tax,
           total_amount    = v_tot,
           amount_paid     = v_paid,
           payment_status  = CASE
                                 WHEN v_paid = 0      THEN 'UNPAID'
                                 WHEN v_paid <  v_tot THEN 'PARTIAL'
                                 WHEN v_paid =  v_tot THEN 'PAID'
                                 ELSE 'OVERPAID'
                             END
     WHERE purchase_invoice_id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION erp.trg_refresh_purchase_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM erp.refresh_purchase_invoice_state(COALESCE(NEW.purchase_invoice_id, OLD.purchase_invoice_id));
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_items_refresh ON erp.purchase_invoice_items;
CREATE TRIGGER trg_purchase_items_refresh
    AFTER INSERT OR UPDATE OR DELETE ON erp.purchase_invoice_items
    FOR EACH ROW EXECUTE FUNCTION erp.trg_refresh_purchase_from_items();

-- ---------------------------------------------------------------------
-- Payments feed back into whichever invoice they belong to
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.trg_refresh_invoice_from_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sales BIGINT := COALESCE(NEW.sales_invoice_id,    OLD.sales_invoice_id);
    v_purch BIGINT := COALESCE(NEW.purchase_invoice_id, OLD.purchase_invoice_id);
BEGIN
    IF v_sales IS NOT NULL THEN
        PERFORM erp.refresh_sales_invoice_state(v_sales);
    END IF;
    IF v_purch IS NOT NULL THEN
        PERFORM erp.refresh_purchase_invoice_state(v_purch);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_refresh ON erp.payments;
CREATE TRIGGER trg_payments_refresh
    AFTER INSERT OR UPDATE OR DELETE ON erp.payments
    FOR EACH ROW EXECUTE FUNCTION erp.trg_refresh_invoice_from_payment();

-- ---------------------------------------------------------------------
-- 4 + 5. Sales invoice confirmation and cancellation post stock
-- Optional stock guard: SELECT set_config('app.enforce_stock','on',true);
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.post_sales_invoice_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    r         RECORD;
    v_enforce BOOLEAN := COALESCE(current_setting('app.enforce_stock', true), 'off') = 'on';
    v_avail   NUMERIC(14,3);
BEGIN
    -- DRAFT -> CONFIRMED : ship the goods
    IF OLD.status = 'DRAFT' AND NEW.status = 'CONFIRMED' THEN

        IF NOT EXISTS (SELECT 1 FROM erp.sales_invoice_items WHERE sales_invoice_id = NEW.sales_invoice_id) THEN
            RAISE EXCEPTION 'Sales invoice % cannot be confirmed with no line items.', NEW.invoice_no;
        END IF;

        FOR r IN SELECT product_id, SUM(quantity) AS qty, MAX(unit_cost) AS cost
                   FROM erp.sales_invoice_items
                  WHERE sales_invoice_id = NEW.sales_invoice_id
                  GROUP BY product_id
        LOOP
            IF v_enforce THEN
                SELECT stock_on_hand INTO v_avail FROM erp.products WHERE product_id = r.product_id;
                IF v_avail < r.qty THEN
                    RAISE EXCEPTION
                        'Insufficient stock for product % on invoice %: have %, need %.',
                        r.product_id, NEW.invoice_no, v_avail, r.qty;
                END IF;
            END IF;

            INSERT INTO erp.inventory_movements
                (product_id, warehouse_id, movement_type, quantity, unit_cost,
                 movement_date, reference_type, reference_id, created_by, notes)
            VALUES
                (r.product_id, NEW.warehouse_id, 'SALE_OUT', r.qty, r.cost,
                 NEW.invoice_date, 'SALES_INVOICE', NEW.sales_invoice_id, NEW.created_by,
                 'Auto-posted on confirmation of ' || NEW.invoice_no);
        END LOOP;

        UPDATE erp.sales_invoices SET confirmed_at = now() WHERE sales_invoice_id = NEW.sales_invoice_id;

    -- CONFIRMED -> CANCELLED : reverse it
    ELSIF OLD.status = 'CONFIRMED' AND NEW.status = 'CANCELLED' THEN

        FOR r IN SELECT product_id, SUM(quantity) AS qty, MAX(unit_cost) AS cost
                   FROM erp.sales_invoice_items
                  WHERE sales_invoice_id = NEW.sales_invoice_id
                  GROUP BY product_id
        LOOP
            INSERT INTO erp.inventory_movements
                (product_id, warehouse_id, movement_type, quantity, unit_cost,
                 movement_date, reference_type, reference_id, created_by, notes)
            VALUES
                (r.product_id, NEW.warehouse_id, 'RETURN_IN', r.qty, r.cost,
                 CURRENT_DATE, 'SALES_INVOICE', NEW.sales_invoice_id, NEW.created_by,
                 'Reversal on cancellation of ' || NEW.invoice_no);
        END LOOP;

        UPDATE erp.sales_invoices SET cancelled_at = now() WHERE sales_invoice_id = NEW.sales_invoice_id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_post_stock ON erp.sales_invoices;
CREATE TRIGGER trg_sales_post_stock
    AFTER UPDATE OF status ON erp.sales_invoices
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION erp.post_sales_invoice_stock();

-- ---------------------------------------------------------------------
-- 6. Purchase confirmation: receive stock + moving-average cost update
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.post_purchase_invoice_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    r            RECORD;
    v_stock      NUMERIC(14,3);
    v_old_cost   NUMERIC(14,2);
    v_new_cost   NUMERIC(14,2);
BEGIN
    IF OLD.status = 'DRAFT' AND NEW.status = 'CONFIRMED' THEN

        IF NOT EXISTS (SELECT 1 FROM erp.purchase_invoice_items WHERE purchase_invoice_id = NEW.purchase_invoice_id) THEN
            RAISE EXCEPTION 'Purchase invoice % cannot be confirmed with no line items.', NEW.invoice_no;
        END IF;

        FOR r IN SELECT product_id,
                        SUM(quantity) AS qty,
                        ROUND(SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0), 2) AS cost
                   FROM erp.purchase_invoice_items
                  WHERE purchase_invoice_id = NEW.purchase_invoice_id
                  GROUP BY product_id
        LOOP
            SELECT stock_on_hand, cost_price INTO v_stock, v_old_cost
              FROM erp.products WHERE product_id = r.product_id;

            -- Weighted moving average; falls back to the new cost if stock was nil
            IF v_stock IS NULL OR v_stock <= 0 THEN
                v_new_cost := r.cost;
            ELSE
                v_new_cost := ROUND(((v_stock * v_old_cost) + (r.qty * r.cost)) / (v_stock + r.qty), 2);
            END IF;

            UPDATE erp.products SET cost_price = v_new_cost WHERE product_id = r.product_id;

            INSERT INTO erp.product_suppliers (product_id, supplier_id, last_cost_price)
            VALUES (r.product_id, NEW.supplier_id, r.cost)
            ON CONFLICT (product_id, supplier_id)
            DO UPDATE SET last_cost_price = EXCLUDED.last_cost_price;

            INSERT INTO erp.inventory_movements
                (product_id, warehouse_id, movement_type, quantity, unit_cost,
                 movement_date, reference_type, reference_id, created_by, notes)
            VALUES
                (r.product_id, NEW.warehouse_id, 'PURCHASE_IN', r.qty, r.cost,
                 NEW.invoice_date, 'PURCHASE_INVOICE', NEW.purchase_invoice_id, NEW.created_by,
                 'Auto-posted on confirmation of ' || NEW.invoice_no);
        END LOOP;

        UPDATE erp.purchase_invoices SET confirmed_at = now() WHERE purchase_invoice_id = NEW.purchase_invoice_id;

    ELSIF OLD.status = 'CONFIRMED' AND NEW.status = 'CANCELLED' THEN

        FOR r IN SELECT product_id,
                        SUM(quantity) AS qty,
                        ROUND(SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0), 2) AS cost
                   FROM erp.purchase_invoice_items
                  WHERE purchase_invoice_id = NEW.purchase_invoice_id
                  GROUP BY product_id
        LOOP
            INSERT INTO erp.inventory_movements
                (product_id, warehouse_id, movement_type, quantity, unit_cost,
                 movement_date, reference_type, reference_id, created_by, notes)
            VALUES
                (r.product_id, NEW.warehouse_id, 'RETURN_OUT', r.qty, r.cost,
                 CURRENT_DATE, 'PURCHASE_INVOICE', NEW.purchase_invoice_id, NEW.created_by,
                 'Reversal on cancellation of ' || NEW.invoice_no);
        END LOOP;

        UPDATE erp.purchase_invoices SET cancelled_at = now() WHERE purchase_invoice_id = NEW.purchase_invoice_id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_post_stock ON erp.purchase_invoices;
CREATE TRIGGER trg_purchase_post_stock
    AFTER UPDATE OF status ON erp.purchase_invoices
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION erp.post_purchase_invoice_stock();

-- ---------------------------------------------------------------------
-- Convenience wrappers (nicer to call from FastAPI / Next.js than a raw UPDATE)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.confirm_sales_invoice(p_invoice_id BIGINT)
RETURNS erp.sales_invoices
LANGUAGE sql
AS $$
    UPDATE erp.sales_invoices SET status = 'CONFIRMED'
     WHERE sales_invoice_id = p_invoice_id AND status = 'DRAFT'
    RETURNING *;
$$;

CREATE OR REPLACE FUNCTION erp.confirm_purchase_invoice(p_invoice_id BIGINT)
RETURNS erp.purchase_invoices
LANGUAGE sql
AS $$
    UPDATE erp.purchase_invoices SET status = 'CONFIRMED'
     WHERE purchase_invoice_id = p_invoice_id AND status = 'DRAFT'
    RETURNING *;
$$;
