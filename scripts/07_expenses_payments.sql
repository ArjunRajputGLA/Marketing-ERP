-- =====================================================================
-- File   : 07_expenses_payments.sql
-- Purpose: Expense categories, expenses, and payments against invoices
-- =====================================================================

CREATE TABLE IF NOT EXISTS erp.expense_categories (
    expense_category_id  SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                 TEXT         NOT NULL UNIQUE,
    is_fixed_cost        BOOLEAN      NOT NULL DEFAULT FALSE,
    description          TEXT,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON COLUMN erp.expense_categories.is_fixed_cost IS 'Separates fixed overhead from variable spend. The Finance agent uses this when attributing a profit decline.';

-- ---------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.expenses (
    expense_id           BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expense_no           TEXT          UNIQUE,
    expense_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
    expense_category_id  SMALLINT      NOT NULL REFERENCES erp.expense_categories(expense_category_id),
    amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    description          TEXT,
    vendor_name          TEXT,
    payment_method       TEXT          CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE')),
    reference_no         TEXT,
    created_by           BIGINT        REFERENCES erp.users(user_id),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON erp.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON erp.expenses(expense_category_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_owner    ON erp.expenses(created_by);

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON erp.expenses;
CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON erp.expenses
    FOR EACH ROW EXECUTE FUNCTION erp.set_updated_at();

-- ---------------------------------------------------------------------
-- payments
-- A payment points at exactly one invoice, enforced by CHECK rather
-- than a polymorphic reference_type/reference_id pair, so the foreign
-- keys stay real.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.payments (
    payment_id           BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_no           TEXT          UNIQUE,
    payment_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
    direction            TEXT          NOT NULL CHECK (direction IN ('IN', 'OUT')),
    amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    method               TEXT          NOT NULL DEFAULT 'CASH'
                                       CHECK (method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE')),
    sales_invoice_id     BIGINT        REFERENCES erp.sales_invoices(sales_invoice_id)    ON DELETE CASCADE,
    purchase_invoice_id  BIGINT        REFERENCES erp.purchase_invoices(purchase_invoice_id) ON DELETE CASCADE,
    reference_no         TEXT,
    notes                TEXT,
    created_by           BIGINT        REFERENCES erp.users(user_id),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

    -- Exactly one invoice reference
    CONSTRAINT payments_single_target_chk CHECK (
        (sales_invoice_id IS NOT NULL)::int + (purchase_invoice_id IS NOT NULL)::int = 1
    ),
    -- Money in belongs to a sale, money out to a purchase
    CONSTRAINT payments_direction_match_chk CHECK (
        (direction = 'IN'  AND sales_invoice_id    IS NOT NULL) OR
        (direction = 'OUT' AND purchase_invoice_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_payments_date      ON erp.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_sales_inv ON erp.payments(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_purch_inv ON erp.payments(purchase_invoice_id);
