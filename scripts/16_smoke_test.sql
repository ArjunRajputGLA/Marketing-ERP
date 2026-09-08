-- =====================================================================
-- File   : 16_smoke_test.sql
-- Purpose: Prove the transaction flow and the tools layer actually work.
--          Runs inside a transaction and rolls back, so it leaves no data.
--          Run this after every schema change. If it passes, the totals,
--          the ledger, the cost snapshot and the authorisation guard are
--          all behaving.
-- Usage  : psql -v ON_ERROR_STOP=1 -f 16_smoke_test.sql
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_admin     BIGINT;
    v_wh        SMALLINT;
    v_cat       INTEGER;
    v_prod      BIGINT;
    v_cust      BIGINT;
    v_supp      BIGINT;
    v_pinv      BIGINT;
    v_sinv      BIGINT;
    v_stock     NUMERIC;
    v_total     NUMERIC;
    v_cogs      NUMERIC;
    v_status    TEXT;
    v_cost      NUMERIC;
    v_rev       NUMERIC;
    v_denied    BOOLEAN := FALSE;
BEGIN
    SELECT user_id      INTO v_admin FROM erp.users      WHERE username = 'admin';
    SELECT warehouse_id INTO v_wh    FROM erp.warehouses WHERE is_default;
    SELECT category_id  INTO v_cat   FROM erp.categories WHERE name = 'Electronics';

    -- ---------- master data ----------
    INSERT INTO erp.products (sku, name, category_id, unit, cost_price, selling_price, reorder_level)
    VALUES ('TEST-SKU-001', 'Smoke Test Widget', v_cat, 'PCS', 100.00, 150.00, 10)
    RETURNING product_id INTO v_prod;

    INSERT INTO erp.customers (code, name, customer_type, created_by)
    VALUES ('TEST-CUST-001', 'Smoke Test Customer', 'RETAIL', v_admin)
    RETURNING customer_id INTO v_cust;

    INSERT INTO erp.suppliers (code, name, created_by)
    VALUES ('TEST-SUPP-001', 'Smoke Test Supplier', v_admin)
    RETURNING supplier_id INTO v_supp;

    -- ---------- purchase 100 units at 120 ----------
    INSERT INTO erp.purchase_invoices (invoice_no, invoice_date, supplier_id, warehouse_id, created_by)
    VALUES ('TEST-PI-001', CURRENT_DATE - 20, v_supp, v_wh, v_admin)
    RETURNING purchase_invoice_id INTO v_pinv;

    INSERT INTO erp.purchase_invoice_items (purchase_invoice_id, line_no, product_id, quantity, unit_cost)
    VALUES (v_pinv, 1, v_prod, 100, 120.00);

    SELECT total_amount INTO v_total FROM erp.purchase_invoices WHERE purchase_invoice_id = v_pinv;
    IF v_total <> 12000.00 THEN
        RAISE EXCEPTION 'FAIL: purchase total should be 12000.00, got %', v_total;
    END IF;

    UPDATE erp.purchase_invoices SET status = 'CONFIRMED' WHERE purchase_invoice_id = v_pinv;

    SELECT stock_on_hand, cost_price INTO v_stock, v_cost FROM erp.products WHERE product_id = v_prod;
    IF v_stock <> 100 THEN
        RAISE EXCEPTION 'FAIL: stock after purchase should be 100, got %', v_stock;
    END IF;
    -- opening stock was 0, so moving average collapses to the purchase cost
    IF v_cost <> 120.00 THEN
        RAISE EXCEPTION 'FAIL: moving-average cost should be 120.00, got %', v_cost;
    END IF;

    -- ---------- sell 30 units at 200 with 10% discount and 5% tax ----------
    INSERT INTO erp.sales_invoices (invoice_no, invoice_date, customer_id, warehouse_id, created_by)
    VALUES ('TEST-SI-001', CURRENT_DATE - 5, v_cust, v_wh, v_admin)
    RETURNING sales_invoice_id INTO v_sinv;

    INSERT INTO erp.sales_invoice_items
        (sales_invoice_id, line_no, product_id, quantity, unit_price, discount_percent, tax_percent)
    VALUES (v_sinv, 1, v_prod, 30, 200.00, 10, 5);

    -- 30 * 200 = 6000 ; discount 600 ; taxable 5400 ; tax 270 ; total 5670
    SELECT total_amount, cogs_amount INTO v_total, v_cogs
      FROM erp.sales_invoices WHERE sales_invoice_id = v_sinv;
    IF v_total <> 5670.00 THEN
        RAISE EXCEPTION 'FAIL: sales total should be 5670.00, got %', v_total;
    END IF;
    -- unit_cost was snapshotted from the post-purchase cost of 120
    IF v_cogs <> 3600.00 THEN
        RAISE EXCEPTION 'FAIL: COGS should be 3600.00 (30 x 120), got %', v_cogs;
    END IF;

    UPDATE erp.sales_invoices SET status = 'CONFIRMED' WHERE sales_invoice_id = v_sinv;

    SELECT stock_on_hand INTO v_stock FROM erp.products WHERE product_id = v_prod;
    IF v_stock <> 70 THEN
        RAISE EXCEPTION 'FAIL: stock after sale should be 70, got %', v_stock;
    END IF;

    -- ---------- payment status ----------
    INSERT INTO erp.payments (payment_date, direction, amount, method, sales_invoice_id, created_by)
    VALUES (CURRENT_DATE, 'IN', 2000.00, 'UPI', v_sinv, v_admin);

    SELECT payment_status INTO v_status FROM erp.sales_invoices WHERE sales_invoice_id = v_sinv;
    IF v_status <> 'PARTIAL' THEN
        RAISE EXCEPTION 'FAIL: payment status should be PARTIAL, got %', v_status;
    END IF;

    INSERT INTO erp.payments (payment_date, direction, amount, method, sales_invoice_id, created_by)
    VALUES (CURRENT_DATE, 'IN', 3670.00, 'CASH', v_sinv, v_admin);

    SELECT payment_status INTO v_status FROM erp.sales_invoices WHERE sales_invoice_id = v_sinv;
    IF v_status <> 'PAID' THEN
        RAISE EXCEPTION 'FAIL: payment status should be PAID, got %', v_status;
    END IF;

    -- ---------- ledger is append-only ----------
    BEGIN
        UPDATE erp.inventory_movements SET quantity = 1 WHERE product_id = v_prod;
        RAISE EXCEPTION 'FAIL: inventory_movements accepted an UPDATE';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;   -- our own failure, re-raise
    END;

    -- ---------- cache matches the ledger ----------
    IF EXISTS (SELECT 1 FROM erp.recalculate_stock_on_hand(NULL)) THEN
        RAISE EXCEPTION 'FAIL: stock_on_hand drifted from the ledger';
    END IF;

    -- ---------- tools layer, as MANAGER ----------
    PERFORM set_config('app.user_id', v_admin::TEXT, TRUE);
    PERFORM set_config('app.role_code', 'MANAGER', TRUE);

    SELECT net_revenue INTO v_rev
      FROM tools.get_sales_summary(CURRENT_DATE - 30, CURRENT_DATE);
    IF v_rev < 5400.00 THEN
        RAISE EXCEPTION 'FAIL: tools.get_sales_summary net_revenue should be at least 5400.00, got %', v_rev;
    END IF;

    PERFORM tools.get_profit_breakdown(CURRENT_DATE - 30, CURRENT_DATE);
    PERFORM tools.get_inventory_status(TRUE);
    PERFORM tools.get_stockout_risk(14);
    PERFORM tools.compare_periods(CURRENT_DATE - 30, CURRENT_DATE,
                                  CURRENT_DATE - 60, CURRENT_DATE - 31);

    -- ---------- authorisation guard, as USER ----------
    PERFORM set_config('app.role_code', 'USER', TRUE);
    PERFORM tools.get_sales_summary(CURRENT_DATE - 30, CURRENT_DATE);   -- allowed

    BEGIN
        PERFORM tools.get_profit_breakdown(CURRENT_DATE - 30, CURRENT_DATE);
    EXCEPTION WHEN insufficient_privilege THEN
        v_denied := TRUE;
    END;
    IF NOT v_denied THEN
        RAISE EXCEPTION 'FAIL: USER role was allowed into the FINANCE scope';
    END IF;

    PERFORM set_config('app.role_code', 'MANAGER', TRUE);

    RAISE NOTICE 'PASS: totals, COGS snapshot, ledger, stock cache, payments, tools and authorisation guard all behave.';
END;
$$;

ROLLBACK;
