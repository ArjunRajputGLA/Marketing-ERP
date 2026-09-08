-- =====================================================================
-- File   : 05_purchases.sql
-- Purpose: Purchase invoices and line items (mirror of the sales side)
-- =====================================================================

CREATE TABLE IF NOT EXISTS erp.purchase_invoices (
    purchase_invoice_id  BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_no           TEXT          NOT NULL UNIQUE,
    supplier_invoice_ref TEXT,
    invoice_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
    supplier_id          BIGINT        NOT NULL REFERENCES erp.suppliers(supplier_id),
    warehouse_id         SMALLINT      REFERENCES erp.warehouses(warehouse_id),

    subtotal             NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,

    amount_paid          NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_status       TEXT          NOT NULL DEFAULT 'UNPAID'
                                       CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERPAID')),
    status               TEXT          NOT NULL DEFAULT 'DRAFT'
                                       CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
    notes                TEXT,
    created_by           BIGINT        REFERENCES erp.users(user_id),
    confirmed_at         TIMESTAMPTZ,
    cancelled_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT purch_inv_amounts_chk CHECK (
        subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0
        AND total_amount >= 0 AND amount_paid >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_purch_inv_date      ON erp.purchase_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purch_inv_supplier  ON erp.purchase_invoices(supplier_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_purch_inv_status    ON erp.purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purch_inv_confirmed ON erp.purchase_invoices(invoice_date) WHERE status = 'CONFIRMED';

DROP TRIGGER IF EXISTS trg_purchase_invoices_updated_at ON erp.purchase_invoices;
CREATE TRIGGER trg_purchase_invoices_updated_at
    BEFORE UPDATE ON erp.purchase_invoices
    FOR EACH ROW EXECUTE FUNCTION erp.set_updated_at();

-- ---------------------------------------------------------------------
-- purchase_invoice_items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.purchase_invoice_items (
    purchase_item_id     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_invoice_id  BIGINT        NOT NULL REFERENCES erp.purchase_invoices(purchase_invoice_id) ON DELETE CASCADE,
    line_no              SMALLINT      NOT NULL,
    product_id           BIGINT        NOT NULL REFERENCES erp.products(product_id),
    quantity             NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
    unit_cost            NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
    discount_percent     NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
    tax_percent          NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (tax_percent BETWEEN 0 AND 100),

    line_subtotal NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND(quantity * unit_cost, 2)) STORED,
    line_discount NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND(quantity * unit_cost * discount_percent / 100.0, 2)) STORED,
    line_tax      NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND((quantity * unit_cost - quantity * unit_cost * discount_percent / 100.0)
               * tax_percent / 100.0, 2)) STORED,
    line_total    NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND((quantity * unit_cost - quantity * unit_cost * discount_percent / 100.0)
               * (1 + tax_percent / 100.0), 2)) STORED,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_purchase_item_line UNIQUE (purchase_invoice_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_purch_items_invoice ON erp.purchase_invoice_items(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purch_items_product ON erp.purchase_invoice_items(product_id);
