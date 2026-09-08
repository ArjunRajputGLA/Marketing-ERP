-- =====================================================================
-- File   : 04_sales.sql
-- Purpose: Sales invoices and invoice line items
-- Note   : Line arithmetic lives in GENERATED columns so that no
--          application code can produce an internally inconsistent row.
--          Every number the AI reports about sales traces back to here.
-- =====================================================================

CREATE TABLE IF NOT EXISTS erp.sales_invoices (
    sales_invoice_id  BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_no        TEXT          NOT NULL UNIQUE,
    invoice_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
    customer_id       BIGINT        NOT NULL REFERENCES erp.customers(customer_id),
    warehouse_id      SMALLINT      REFERENCES erp.warehouses(warehouse_id),

    -- All five are maintained by trigger from the line items. Do not write directly.
    subtotal          NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    cogs_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,

    amount_paid       NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_status    TEXT          NOT NULL DEFAULT 'UNPAID'
                                    CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERPAID')),
    status            TEXT          NOT NULL DEFAULT 'DRAFT'
                                    CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
    notes             TEXT,
    created_by        BIGINT        REFERENCES erp.users(user_id),
    confirmed_at      TIMESTAMPTZ,
    cancelled_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT sales_inv_amounts_chk CHECK (
        subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0
        AND total_amount >= 0 AND cogs_amount >= 0 AND amount_paid >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_sales_inv_date      ON erp.sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_inv_customer  ON erp.sales_invoices(customer_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_inv_status    ON erp.sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_inv_confirmed ON erp.sales_invoices(invoice_date) WHERE status = 'CONFIRMED';
CREATE INDEX IF NOT EXISTS idx_sales_inv_owner     ON erp.sales_invoices(created_by);

DROP TRIGGER IF EXISTS trg_sales_invoices_updated_at ON erp.sales_invoices;
CREATE TRIGGER trg_sales_invoices_updated_at
    BEFORE UPDATE ON erp.sales_invoices
    FOR EACH ROW EXECUTE FUNCTION erp.set_updated_at();

COMMENT ON COLUMN erp.sales_invoices.cogs_amount IS 'Cost of goods sold, snapshotted per line at sale time. Makes gross profit deterministic and independent of later cost_price edits.';
COMMENT ON COLUMN erp.sales_invoices.status      IS 'Only CONFIRMED invoices post inventory movements and count towards revenue. DRAFT and CANCELLED are excluded from every reporting view.';

-- ---------------------------------------------------------------------
-- sales_invoice_items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.sales_invoice_items (
    sales_item_id     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sales_invoice_id  BIGINT        NOT NULL REFERENCES erp.sales_invoices(sales_invoice_id) ON DELETE CASCADE,
    line_no           SMALLINT      NOT NULL,
    product_id        BIGINT        NOT NULL REFERENCES erp.products(product_id),
    quantity          NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
    unit_price        NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    unit_cost         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    discount_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
    tax_percent       NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (tax_percent BETWEEN 0 AND 100),

    line_subtotal NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND(quantity * unit_price, 2)) STORED,
    line_discount NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND(quantity * unit_price * discount_percent / 100.0, 2)) STORED,
    line_tax      NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND((quantity * unit_price - quantity * unit_price * discount_percent / 100.0)
               * tax_percent / 100.0, 2)) STORED,
    line_total    NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND((quantity * unit_price - quantity * unit_price * discount_percent / 100.0)
               * (1 + tax_percent / 100.0), 2)) STORED,
    line_cogs     NUMERIC(14,2) GENERATED ALWAYS AS
        (ROUND(quantity * unit_cost, 2)) STORED,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_sales_item_line UNIQUE (sales_invoice_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_sales_items_invoice ON erp.sales_invoice_items(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product ON erp.sales_invoice_items(product_id);

COMMENT ON COLUMN erp.sales_invoice_items.unit_cost IS 'Copied from erp.products.cost_price at line creation (see trigger in 08). Frozen thereafter.';
