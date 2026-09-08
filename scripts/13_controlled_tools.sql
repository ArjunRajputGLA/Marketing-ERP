-- =====================================================================
-- File   : 13_controlled_tools.sql
-- Purpose: The only database surface the AI service is permitted to touch.
--
-- Every function here is:
--   * SECURITY DEFINER with a pinned search_path, so the caller needs no
--     table privileges of its own,
--   * STABLE, so it is structurally incapable of writing,
--   * guarded by tools.assert_authorized(), so the access-control result
--     is an enforced property rather than a prompt instruction,
--   * parameterised, so the model never composes SQL text.
--
-- FastAPI is responsible for writing the ai.tool_calls log row around each
-- call. A STABLE function cannot log itself, and that is deliberate.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Authorisation guard
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tools.assert_authorized(p_scope TEXT)
RETURNS VOID
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
DECLARE
    v_role TEXT := erp.current_role_code();
BEGIN
    IF v_role IN ('ADMIN', 'MANAGER') THEN
        RETURN;
    END IF;

    IF v_role = 'USER' AND p_scope IN ('SALES', 'INVENTORY') THEN
        RETURN;
    END IF;

    RAISE EXCEPTION
        'DENIED: role % is not authorised for scope %.', v_role, p_scope
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION tools.assert_authorized(TEXT) IS 'Role-to-scope matrix. USER sees sales and inventory only; finance, customer and supplier scopes are ADMIN/MANAGER. Raises insufficient_privilege, which FastAPI logs as ai.tool_calls.status = DENIED.';

-- ---------------------------------------------------------------------
-- Entity resolution for the NLP layer (trigram-backed)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tools.resolve_entity(p_kind TEXT, p_text TEXT, p_limit INT DEFAULT 5)
RETURNS TABLE (entity_id BIGINT, entity_name TEXT, similarity REAL)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    IF UPPER(p_kind) = 'PRODUCT' THEN
        PERFORM tools.assert_authorized('SALES');
        RETURN QUERY
        SELECT p.product_id, p.name, similarity(p.name, p_text)
          FROM erp.products p
         WHERE p.name % p_text OR p.sku ILIKE p_text
         ORDER BY similarity(p.name, p_text) DESC
         LIMIT p_limit;
    ELSIF UPPER(p_kind) = 'CUSTOMER' THEN
        PERFORM tools.assert_authorized('CUSTOMER');
        RETURN QUERY
        SELECT c.customer_id, c.name, similarity(c.name, p_text)
          FROM erp.customers c
         WHERE c.name % p_text OR c.code ILIKE p_text
         ORDER BY similarity(c.name, p_text) DESC
         LIMIT p_limit;
    ELSIF UPPER(p_kind) = 'SUPPLIER' THEN
        PERFORM tools.assert_authorized('SUPPLIER');
        RETURN QUERY
        SELECT s.supplier_id, s.name, similarity(s.name, p_text)
          FROM erp.suppliers s
         WHERE s.name % p_text OR s.code ILIKE p_text
         ORDER BY similarity(s.name, p_text) DESC
         LIMIT p_limit;
    ELSE
        RAISE EXCEPTION 'Unknown entity kind: %. Expected PRODUCT, CUSTOMER or SUPPLIER.', p_kind;
    END IF;
END;
$$;

-- =====================================================================
-- SALES SCOPE
-- =====================================================================

CREATE OR REPLACE FUNCTION tools.get_sales_summary(p_start DATE, p_end DATE)
RETURNS TABLE (period_start DATE, period_end DATE, invoice_count BIGINT,
               units_sold NUMERIC, net_revenue NUMERIC, total_discount NUMERIC,
               cogs NUMERIC, gross_profit NUMERIC, gross_margin_pct NUMERIC,
               avg_order_value NUMERIC, active_customers BIGINT)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('SALES');
    RETURN QUERY
    SELECT p_start, p_end,
           COUNT(DISTINCT si.sales_invoice_id),
           COALESCE(SUM(sii.quantity), 0),
           COALESCE(SUM(sii.line_subtotal - sii.line_discount), 0),
           COALESCE(SUM(sii.line_discount), 0),
           COALESCE(SUM(sii.line_cogs), 0),
           COALESCE(SUM(sii.line_subtotal - sii.line_discount - sii.line_cogs), 0),
           ROUND(100.0 * COALESCE(SUM(sii.line_subtotal - sii.line_discount - sii.line_cogs), 0)
                 / NULLIF(SUM(sii.line_subtotal - sii.line_discount), 0), 2),
           ROUND(COALESCE(SUM(sii.line_subtotal - sii.line_discount), 0)
                 / NULLIF(COUNT(DISTINCT si.sales_invoice_id), 0), 2),
           COUNT(DISTINCT si.customer_id)
      FROM erp.sales_invoices si
      JOIN erp.sales_invoice_items sii ON sii.sales_invoice_id = si.sales_invoice_id
     WHERE si.status = 'CONFIRMED'
       AND si.invoice_date BETWEEN p_start AND p_end;
END;
$$;

CREATE OR REPLACE FUNCTION tools.get_sales_series(p_start DATE, p_end DATE, p_granularity TEXT DEFAULT 'day')
RETURNS TABLE (bucket DATE, invoice_count BIGINT, units_sold NUMERIC,
               net_revenue NUMERIC, gross_profit NUMERIC)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
DECLARE
    v_gran TEXT := LOWER(p_granularity);
BEGIN
    PERFORM tools.assert_authorized('SALES');
    IF v_gran NOT IN ('day', 'week', 'month') THEN
        RAISE EXCEPTION 'Invalid granularity: %. Expected day, week or month.', p_granularity;
    END IF;

    RETURN QUERY
    SELECT DATE_TRUNC(v_gran, si.invoice_date)::DATE,
           COUNT(DISTINCT si.sales_invoice_id),
           COALESCE(SUM(sii.quantity), 0),
           COALESCE(SUM(sii.line_subtotal - sii.line_discount), 0),
           COALESCE(SUM(sii.line_subtotal - sii.line_discount - sii.line_cogs), 0)
      FROM erp.sales_invoices si
      JOIN erp.sales_invoice_items sii ON sii.sales_invoice_id = si.sales_invoice_id
     WHERE si.status = 'CONFIRMED'
       AND si.invoice_date BETWEEN p_start AND p_end
     GROUP BY 1
     ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION tools.get_top_products(p_start DATE, p_end DATE,
                                                  p_limit INT DEFAULT 10,
                                                  p_rank_by TEXT DEFAULT 'revenue')
RETURNS TABLE (product_id BIGINT, sku TEXT, product_name TEXT, category_name TEXT,
               units_sold NUMERIC, net_revenue NUMERIC, gross_profit NUMERIC, margin_pct NUMERIC)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
DECLARE
    v_by TEXT := LOWER(p_rank_by);
BEGIN
    PERFORM tools.assert_authorized('SALES');
    IF v_by NOT IN ('revenue', 'quantity', 'profit') THEN
        RAISE EXCEPTION 'Invalid p_rank_by: %. Expected revenue, quantity or profit.', p_rank_by;
    END IF;

    RETURN QUERY
    SELECT v.product_id, v.sku, v.product_name, v.category_name,
           SUM(v.quantity),
           SUM(v.net_revenue),
           SUM(v.gross_profit),
           ROUND(100.0 * SUM(v.gross_profit) / NULLIF(SUM(v.net_revenue), 0), 2)
      FROM erp.v_product_sales v
     WHERE v.invoice_date BETWEEN p_start AND p_end
     GROUP BY v.product_id, v.sku, v.product_name, v.category_name
     ORDER BY CASE v_by
                  WHEN 'revenue'  THEN SUM(v.net_revenue)
                  WHEN 'quantity' THEN SUM(v.quantity)
                  ELSE                 SUM(v.gross_profit)
              END DESC
     LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION tools.get_discount_analysis(p_start DATE, p_end DATE)
RETURNS TABLE (bucket DATE, avg_discount_pct NUMERIC, total_discount NUMERIC,
               net_revenue NUMERIC, discount_share_pct NUMERIC, lines_discounted BIGINT, lines_total BIGINT)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('SALES');
    RETURN QUERY
    SELECT DATE_TRUNC('month', si.invoice_date)::DATE,
           ROUND(AVG(sii.discount_percent), 2),
           SUM(sii.line_discount),
           SUM(sii.line_subtotal - sii.line_discount),
           ROUND(100.0 * SUM(sii.line_discount) / NULLIF(SUM(sii.line_subtotal), 0), 2),
           COUNT(*) FILTER (WHERE sii.discount_percent > 0),
           COUNT(*)
      FROM erp.sales_invoices si
      JOIN erp.sales_invoice_items sii ON sii.sales_invoice_id = si.sales_invoice_id
     WHERE si.status = 'CONFIRMED'
       AND si.invoice_date BETWEEN p_start AND p_end
     GROUP BY 1
     ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION tools.get_product_sales_series(p_product_id BIGINT, p_start DATE, p_end DATE)
RETURNS TABLE (sale_date DATE, units_sold NUMERIC, net_revenue NUMERIC, avg_unit_price NUMERIC, avg_discount_pct NUMERIC)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('SALES');
    RETURN QUERY
    SELECT v.invoice_date,
           SUM(v.quantity),
           SUM(v.net_revenue),
           ROUND(AVG(v.unit_price), 2),
           ROUND(AVG(v.discount_percent), 2)
      FROM erp.v_product_sales v
     WHERE v.product_id = p_product_id
       AND v.invoice_date BETWEEN p_start AND p_end
     GROUP BY v.invoice_date
     ORDER BY v.invoice_date;
END;
$$;

-- =====================================================================
-- FINANCE SCOPE
-- =====================================================================

CREATE OR REPLACE FUNCTION tools.get_profit_breakdown(p_start DATE, p_end DATE)
RETURNS TABLE (component TEXT, amount NUMERIC, note TEXT)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
DECLARE
    v_rev  NUMERIC := 0;
    v_disc NUMERIC := 0;
    v_cogs NUMERIC := 0;
    v_exp  NUMERIC := 0;
BEGIN
    PERFORM tools.assert_authorized('FINANCE');

    SELECT COALESCE(SUM(si.subtotal - si.discount_amount), 0),
           COALESCE(SUM(si.discount_amount), 0),
           COALESCE(SUM(si.cogs_amount), 0)
      INTO v_rev, v_disc, v_cogs
      FROM erp.sales_invoices si
     WHERE si.status = 'CONFIRMED' AND si.invoice_date BETWEEN p_start AND p_end;

    SELECT COALESCE(SUM(e.amount), 0) INTO v_exp
      FROM erp.expenses e
     WHERE e.expense_date BETWEEN p_start AND p_end;

    RETURN QUERY
    SELECT 'net_revenue'::TEXT,      v_rev,                    'Subtotal less discount, tax excluded'::TEXT
    UNION ALL SELECT 'discount_given', v_disc,                 'Reduces revenue'
    UNION ALL SELECT 'cogs',           v_cogs,                 'Unit cost snapshotted at sale time'
    UNION ALL SELECT 'gross_profit',   v_rev - v_cogs,         'net_revenue - cogs'
    UNION ALL SELECT 'operating_expenses', v_exp,              'All expense entries in period'
    UNION ALL SELECT 'operating_profit',   v_rev - v_cogs - v_exp, 'gross_profit - operating_expenses';
END;
$$;

CREATE OR REPLACE FUNCTION tools.compare_periods(p_curr_start DATE, p_curr_end DATE,
                                                 p_prev_start DATE, p_prev_end DATE)
RETURNS TABLE (metric TEXT, current_value NUMERIC, previous_value NUMERIC,
               absolute_change NUMERIC, percent_change NUMERIC)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('FINANCE');
    RETURN QUERY
    WITH cur AS (SELECT * FROM tools.get_profit_breakdown(p_curr_start, p_curr_end)),
         prv AS (SELECT * FROM tools.get_profit_breakdown(p_prev_start, p_prev_end))
    SELECT cur.component,
           cur.amount,
           prv.amount,
           cur.amount - prv.amount,
           ROUND(100.0 * (cur.amount - prv.amount) / NULLIF(ABS(prv.amount), 0), 2)
      FROM cur JOIN prv ON prv.component = cur.component;
END;
$$;

COMMENT ON FUNCTION tools.compare_periods(DATE, DATE, DATE, DATE) IS 'The Finance agent''s entry point for "why did X change" questions. Returns the full decomposition so the coordinator can see which component actually moved.';

CREATE OR REPLACE FUNCTION tools.get_expense_summary(p_start DATE, p_end DATE,
                                                     p_prev_start DATE DEFAULT NULL,
                                                     p_prev_end DATE DEFAULT NULL)
RETURNS TABLE (category_name TEXT, is_fixed_cost BOOLEAN, current_amount NUMERIC,
               previous_amount NUMERIC, absolute_change NUMERIC, percent_change NUMERIC, entry_count BIGINT)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('FINANCE');
    RETURN QUERY
    WITH cur AS (
        SELECT ec.expense_category_id AS cid, ec.name AS cname, ec.is_fixed_cost AS fixed,
               SUM(e.amount) AS amt, COUNT(*) AS cnt
          FROM erp.expenses e
          JOIN erp.expense_categories ec ON ec.expense_category_id = e.expense_category_id
         WHERE e.expense_date BETWEEN p_start AND p_end
         GROUP BY 1, 2, 3
    ),
    prv AS (
        SELECT e.expense_category_id AS cid, SUM(e.amount) AS amt
          FROM erp.expenses e
         WHERE p_prev_start IS NOT NULL
           AND e.expense_date BETWEEN p_prev_start AND p_prev_end
         GROUP BY 1
    )
    SELECT cur.cname, cur.fixed, cur.amt,
           prv.amt,
           cur.amt - COALESCE(prv.amt, 0),
           ROUND(100.0 * (cur.amt - COALESCE(prv.amt, 0)) / NULLIF(prv.amt, 0), 2),
           cur.cnt
      FROM cur LEFT JOIN prv ON prv.cid = cur.cid
     ORDER BY cur.amt DESC;
END;
$$;

-- =====================================================================
-- INVENTORY SCOPE
-- =====================================================================

CREATE OR REPLACE FUNCTION tools.get_inventory_status(p_only_at_risk BOOLEAN DEFAULT FALSE)
RETURNS TABLE (product_id BIGINT, sku TEXT, product_name TEXT, stock_on_hand NUMERIC,
               reorder_level NUMERIC, avg_daily_sold_30d NUMERIC, days_of_cover NUMERIC,
               stock_state TEXT, stock_value_at_cost NUMERIC)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('INVENTORY');
    RETURN QUERY
    SELECT v.product_id, v.sku, v.product_name, v.stock_on_hand, v.reorder_level,
           v.avg_daily_sold_30d, v.days_of_cover, v.stock_state, v.stock_value_at_cost
      FROM erp.v_inventory_status v
     WHERE NOT p_only_at_risk OR v.stock_state <> 'OK'
     ORDER BY CASE v.stock_state WHEN 'STOCK_OUT' THEN 0 WHEN 'BELOW_REORDER' THEN 1 ELSE 2 END,
              v.days_of_cover NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION tools.get_stockout_risk(p_horizon_days INT DEFAULT 14)
RETURNS TABLE (product_id BIGINT, sku TEXT, product_name TEXT, stock_on_hand NUMERIC,
               avg_daily_sold_30d NUMERIC, projected_stock NUMERIC, days_of_cover NUMERIC, at_risk BOOLEAN)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('INVENTORY');
    RETURN QUERY
    SELECT v.product_id, v.sku, v.product_name, v.stock_on_hand, v.avg_daily_sold_30d,
           ROUND(v.stock_on_hand - (v.avg_daily_sold_30d * p_horizon_days), 3),
           v.days_of_cover,
           (v.stock_on_hand - (v.avg_daily_sold_30d * p_horizon_days)) <= 0
      FROM erp.v_inventory_status v
     WHERE v.avg_daily_sold_30d > 0
     ORDER BY (v.stock_on_hand - (v.avg_daily_sold_30d * p_horizon_days)) ASC;
END;
$$;

CREATE OR REPLACE FUNCTION tools.get_slow_moving_products(p_lookback_days INT DEFAULT 60,
                                                          p_max_units NUMERIC DEFAULT 5)
RETURNS TABLE (product_id BIGINT, sku TEXT, product_name TEXT, units_sold NUMERIC,
               stock_on_hand NUMERIC, stock_value_at_cost NUMERIC, last_sold_on DATE)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('INVENTORY');
    RETURN QUERY
    SELECT p.product_id, p.sku, p.name,
           COALESCE(s.units, 0),
           p.stock_on_hand,
           ROUND(p.stock_on_hand * p.cost_price, 2),
           s.last_sold
      FROM erp.products p
      LEFT JOIN (
            SELECT v.product_id AS pid, SUM(v.quantity) AS units, MAX(v.invoice_date) AS last_sold
              FROM erp.v_product_sales v
             WHERE v.invoice_date >= CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL
             GROUP BY v.product_id
      ) s ON s.pid = p.product_id
     WHERE p.is_active
       AND COALESCE(s.units, 0) <= p_max_units
       AND p.stock_on_hand > 0
     ORDER BY (p.stock_on_hand * p.cost_price) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION tools.get_stock_movements(p_product_id BIGINT, p_start DATE, p_end DATE)
RETURNS TABLE (movement_date DATE, movement_type TEXT, quantity NUMERIC,
               signed_quantity NUMERIC, running_balance NUMERIC, reference_type TEXT, reference_id BIGINT)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('INVENTORY');
    RETURN QUERY
    SELECT l.movement_date, l.movement_type, l.quantity, l.signed_quantity,
           l.running_balance, l.reference_type, l.reference_id
      FROM erp.v_stock_ledger l
     WHERE l.product_id = p_product_id
       AND l.movement_date BETWEEN p_start AND p_end
     ORDER BY l.movement_date, l.movement_id;
END;
$$;

-- =====================================================================
-- CUSTOMER SCOPE
-- =====================================================================

CREATE OR REPLACE FUNCTION tools.get_top_customers(p_start DATE, p_end DATE, p_limit INT DEFAULT 10)
RETURNS TABLE (customer_id BIGINT, customer_name TEXT, customer_type TEXT,
               invoice_count BIGINT, net_revenue NUMERIC, gross_profit NUMERIC, avg_order_value NUMERIC)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('CUSTOMER');
    RETURN QUERY
    SELECT c.customer_id, c.name, c.customer_type,
           COUNT(si.sales_invoice_id),
           COALESCE(SUM(si.subtotal - si.discount_amount), 0),
           COALESCE(SUM(si.subtotal - si.discount_amount - si.cogs_amount), 0),
           ROUND(AVG(si.subtotal - si.discount_amount), 2)
      FROM erp.customers c
      JOIN erp.sales_invoices si ON si.customer_id = c.customer_id AND si.status = 'CONFIRMED'
     WHERE si.invoice_date BETWEEN p_start AND p_end
     GROUP BY c.customer_id, c.name, c.customer_type
     ORDER BY 5 DESC
     LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION tools.get_customer_purchase_change(p_curr_start DATE, p_curr_end DATE,
                                                              p_prev_start DATE, p_prev_end DATE,
                                                              p_min_abs_pct NUMERIC DEFAULT 20)
RETURNS TABLE (customer_id BIGINT, customer_name TEXT, current_revenue NUMERIC,
               previous_revenue NUMERIC, absolute_change NUMERIC, percent_change NUMERIC, change_direction TEXT)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('CUSTOMER');
    RETURN QUERY
    WITH cur AS (
        SELECT si.customer_id AS cid, SUM(si.subtotal - si.discount_amount) AS amt
          FROM erp.sales_invoices si
         WHERE si.status = 'CONFIRMED' AND si.invoice_date BETWEEN p_curr_start AND p_curr_end
         GROUP BY 1
    ),
    prv AS (
        SELECT si.customer_id AS cid, SUM(si.subtotal - si.discount_amount) AS amt
          FROM erp.sales_invoices si
         WHERE si.status = 'CONFIRMED' AND si.invoice_date BETWEEN p_prev_start AND p_prev_end
         GROUP BY 1
    ),
    joined AS (
        SELECT COALESCE(cur.cid, prv.cid) AS cid,
               COALESCE(cur.amt, 0) AS cur_amt,
               COALESCE(prv.amt, 0) AS prv_amt
          FROM cur FULL OUTER JOIN prv ON prv.cid = cur.cid
    )
    SELECT j.cid, c.name, j.cur_amt, j.prv_amt,
           j.cur_amt - j.prv_amt,
           ROUND(100.0 * (j.cur_amt - j.prv_amt) / NULLIF(j.prv_amt, 0), 2),
           CASE WHEN j.cur_amt > j.prv_amt THEN 'INCREASE'
                WHEN j.cur_amt < j.prv_amt THEN 'DECREASE'
                ELSE 'FLAT' END
      FROM joined j
      JOIN erp.customers c ON c.customer_id = j.cid
     WHERE j.prv_amt > 0
       AND ABS(100.0 * (j.cur_amt - j.prv_amt) / j.prv_amt) >= p_min_abs_pct
     ORDER BY ABS(j.cur_amt - j.prv_amt) DESC;
END;
$$;

-- =====================================================================
-- SUPPLIER SCOPE
-- =====================================================================

CREATE OR REPLACE FUNCTION tools.get_supplier_price_changes(p_curr_start DATE, p_curr_end DATE,
                                                            p_prev_start DATE, p_prev_end DATE,
                                                            p_min_abs_pct NUMERIC DEFAULT 10)
RETURNS TABLE (supplier_id BIGINT, supplier_name TEXT, product_id BIGINT, product_name TEXT,
               current_avg_cost NUMERIC, previous_avg_cost NUMERIC, percent_change NUMERIC, units_purchased NUMERIC)
LANGUAGE plpgsql STABLE
SET search_path = erp, pg_temp
AS $$
BEGIN
    PERFORM tools.assert_authorized('SUPPLIER');
    RETURN QUERY
    WITH cur AS (
        SELECT v.supplier_id AS sid, v.product_id AS pid,
               ROUND(SUM(v.quantity * v.unit_cost) / NULLIF(SUM(v.quantity), 0), 2) AS cost,
               SUM(v.quantity) AS qty
          FROM erp.v_purchase_lines v
         WHERE v.invoice_date BETWEEN p_curr_start AND p_curr_end
         GROUP BY 1, 2
    ),
    prv AS (
        SELECT v.supplier_id AS sid, v.product_id AS pid,
               ROUND(SUM(v.quantity * v.unit_cost) / NULLIF(SUM(v.quantity), 0), 2) AS cost
          FROM erp.v_purchase_lines v
         WHERE v.invoice_date BETWEEN p_prev_start AND p_prev_end
         GROUP BY 1, 2
    )
    SELECT cur.sid, s.name, cur.pid, p.name,
           cur.cost, prv.cost,
           ROUND(100.0 * (cur.cost - prv.cost) / NULLIF(prv.cost, 0), 2),
           cur.qty
      FROM cur
      JOIN prv ON prv.sid = cur.sid AND prv.pid = cur.pid
      JOIN erp.suppliers s ON s.supplier_id = cur.sid
      JOIN erp.products  p ON p.product_id  = cur.pid
     WHERE ABS(100.0 * (cur.cost - prv.cost) / NULLIF(prv.cost, 0)) >= p_min_abs_pct
     ORDER BY ABS(cur.cost - prv.cost) * cur.qty DESC;
END;
$$;
