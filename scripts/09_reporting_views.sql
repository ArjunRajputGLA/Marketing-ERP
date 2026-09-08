-- =====================================================================
-- File   : 09_reporting_views.sql
-- Purpose: Deterministic analytics. Baseline A reads these directly;
--          the tools layer in file 13 wraps them for the agents.
--
-- Revenue convention used everywhere in this project:
--     net_revenue   = subtotal - discount_amount     (tax excluded)
--     gross_profit  = net_revenue - cogs_amount
--     operating_profit = gross_profit - expenses
-- Only status = 'CONFIRMED' documents are counted.
-- =====================================================================

-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_sales_daily AS
SELECT si.invoice_date                             AS sale_date,
       COUNT(*)                                    AS invoice_count,
       SUM(si.subtotal - si.discount_amount)       AS net_revenue,
       SUM(si.discount_amount)                     AS total_discount,
       SUM(si.tax_amount)                          AS total_tax,
       SUM(si.total_amount)                        AS gross_amount,
       SUM(si.cogs_amount)                         AS cogs,
       SUM(si.subtotal - si.discount_amount - si.cogs_amount) AS gross_profit
FROM erp.sales_invoices si
WHERE si.status = 'CONFIRMED'
GROUP BY si.invoice_date;

-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_sales_monthly AS
SELECT DATE_TRUNC('month', si.invoice_date)::DATE  AS month_start,
       COUNT(*)                                    AS invoice_count,
       COUNT(DISTINCT si.customer_id)              AS active_customers,
       SUM(si.subtotal - si.discount_amount)       AS net_revenue,
       SUM(si.discount_amount)                     AS total_discount,
       SUM(si.cogs_amount)                         AS cogs,
       SUM(si.subtotal - si.discount_amount - si.cogs_amount) AS gross_profit,
       ROUND(100.0 * SUM(si.subtotal - si.discount_amount - si.cogs_amount)
             / NULLIF(SUM(si.subtotal - si.discount_amount), 0), 2) AS gross_margin_pct
FROM erp.sales_invoices si
WHERE si.status = 'CONFIRMED'
GROUP BY 1;

-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_product_sales AS
SELECT si.invoice_date,
       DATE_TRUNC('month', si.invoice_date)::DATE AS month_start,
       sii.product_id,
       p.sku,
       p.name          AS product_name,
       p.category_id,
       c.name          AS category_name,
       si.customer_id,
       sii.quantity,
       sii.unit_price,
       sii.discount_percent,
       sii.line_subtotal - sii.line_discount      AS net_revenue,
       sii.line_cogs                              AS cogs,
       (sii.line_subtotal - sii.line_discount - sii.line_cogs) AS gross_profit
FROM erp.sales_invoice_items sii
JOIN erp.sales_invoices si ON si.sales_invoice_id = sii.sales_invoice_id
JOIN erp.products       p  ON p.product_id  = sii.product_id
LEFT JOIN erp.categories c ON c.category_id = p.category_id
WHERE si.status = 'CONFIRMED';

COMMENT ON VIEW erp.v_product_sales IS 'Flattened confirmed sales lines. The Sales agent''s primary fact source.';

-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_product_performance AS
SELECT p.product_id,
       p.sku,
       p.name                                          AS product_name,
       c.name                                          AS category_name,
       COALESCE(SUM(vps.quantity), 0)                  AS units_sold,
       COALESCE(SUM(vps.net_revenue), 0)               AS net_revenue,
       COALESCE(SUM(vps.gross_profit), 0)              AS gross_profit,
       ROUND(100.0 * COALESCE(SUM(vps.gross_profit), 0)
             / NULLIF(COALESCE(SUM(vps.net_revenue), 0), 0), 2) AS margin_pct,
       MAX(vps.invoice_date)                           AS last_sold_on,
       p.stock_on_hand,
       p.reorder_level
FROM erp.products p
LEFT JOIN erp.v_product_sales vps ON vps.product_id = p.product_id
LEFT JOIN erp.categories       c  ON c.category_id  = p.category_id
GROUP BY p.product_id, p.sku, p.name, c.name, p.stock_on_hand, p.reorder_level;

-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_customer_summary AS
SELECT cu.customer_id,
       cu.code,
       cu.name,
       cu.customer_type,
       COUNT(si.sales_invoice_id)                        AS invoice_count,
       COALESCE(SUM(si.subtotal - si.discount_amount), 0) AS lifetime_revenue,
       COALESCE(SUM(si.subtotal - si.discount_amount - si.cogs_amount), 0) AS lifetime_profit,
       ROUND(AVG(si.subtotal - si.discount_amount), 2)    AS avg_order_value,
       MIN(si.invoice_date)                              AS first_purchase,
       MAX(si.invoice_date)                              AS last_purchase,
       CURRENT_DATE - MAX(si.invoice_date)               AS days_since_last_purchase
FROM erp.customers cu
LEFT JOIN erp.sales_invoices si
       ON si.customer_id = cu.customer_id AND si.status = 'CONFIRMED'
GROUP BY cu.customer_id, cu.code, cu.name, cu.customer_type;

-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_purchase_lines AS
SELECT pi.invoice_date,
       DATE_TRUNC('month', pi.invoice_date)::DATE AS month_start,
       pi.supplier_id,
       s.name AS supplier_name,
       pii.product_id,
       p.sku,
       p.name AS product_name,
       pii.quantity,
       pii.unit_cost,
       pii.line_subtotal - pii.line_discount AS net_cost
FROM erp.purchase_invoice_items pii
JOIN erp.purchase_invoices pi ON pi.purchase_invoice_id = pii.purchase_invoice_id
JOIN erp.suppliers         s  ON s.supplier_id = pi.supplier_id
JOIN erp.products          p  ON p.product_id  = pii.product_id
WHERE pi.status = 'CONFIRMED';

-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_supplier_summary AS
SELECT s.supplier_id,
       s.code,
       s.name,
       COUNT(DISTINCT pi.purchase_invoice_id)  AS invoice_count,
       COALESCE(SUM(pi.total_amount), 0)       AS total_purchased,
       MIN(pi.invoice_date)                    AS first_purchase,
       MAX(pi.invoice_date)                    AS last_purchase
FROM erp.suppliers s
LEFT JOIN erp.purchase_invoices pi
       ON pi.supplier_id = s.supplier_id AND pi.status = 'CONFIRMED'
GROUP BY s.supplier_id, s.code, s.name;

-- ---------------------------------------------------------------------
-- Inventory status with a naive days-of-cover estimate from the last 30 days
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_inventory_status AS
WITH recent AS (
    SELECT product_id, SUM(quantity) / 30.0 AS avg_daily_sold
      FROM erp.v_product_sales
     WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY product_id
)
SELECT p.product_id,
       p.sku,
       p.name AS product_name,
       c.name AS category_name,
       p.stock_on_hand,
       p.reorder_level,
       p.unit,
       ROUND(COALESCE(r.avg_daily_sold, 0), 3) AS avg_daily_sold_30d,
       CASE
           WHEN COALESCE(r.avg_daily_sold, 0) = 0 THEN NULL
           ELSE ROUND(p.stock_on_hand / r.avg_daily_sold, 1)
       END AS days_of_cover,
       CASE
           WHEN p.stock_on_hand <= 0                THEN 'STOCK_OUT'
           WHEN p.stock_on_hand <= p.reorder_level  THEN 'BELOW_REORDER'
           ELSE 'OK'
       END AS stock_state,
       ROUND(p.stock_on_hand * p.cost_price, 2) AS stock_value_at_cost
FROM erp.products p
LEFT JOIN recent      r ON r.product_id  = p.product_id
LEFT JOIN erp.categories c ON c.category_id = p.category_id
WHERE p.is_active;

COMMENT ON VIEW erp.v_inventory_status IS 'days_of_cover uses a flat 30-day mean. The ML forecast in ai.forecasts supersedes it for the stock-out risk tool.';

-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_expense_monthly AS
SELECT DATE_TRUNC('month', e.expense_date)::DATE AS month_start,
       ec.expense_category_id,
       ec.name         AS category_name,
       ec.is_fixed_cost,
       COUNT(*)        AS entry_count,
       SUM(e.amount)   AS total_amount
FROM erp.expenses e
JOIN erp.expense_categories ec ON ec.expense_category_id = e.expense_category_id
GROUP BY 1, 2, 3, 4;

-- ---------------------------------------------------------------------
-- The single most important view for the "why did profit fall" scenario
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_profit_monthly AS
WITH s AS (
    SELECT month_start, net_revenue, cogs, gross_profit, total_discount, invoice_count
      FROM erp.v_sales_monthly
),
e AS (
    SELECT month_start, SUM(total_amount) AS total_expenses
      FROM erp.v_expense_monthly
     GROUP BY month_start
),
months AS (
    SELECT month_start FROM s
    UNION
    SELECT month_start FROM e
)
SELECT m.month_start,
       COALESCE(s.invoice_count, 0)                        AS invoice_count,
       COALESCE(s.net_revenue, 0)                          AS net_revenue,
       COALESCE(s.total_discount, 0)                       AS total_discount,
       COALESCE(s.cogs, 0)                                 AS cogs,
       COALESCE(s.gross_profit, 0)                         AS gross_profit,
       COALESCE(e.total_expenses, 0)                       AS operating_expenses,
       COALESCE(s.gross_profit, 0) - COALESCE(e.total_expenses, 0) AS operating_profit,
       ROUND(100.0 * (COALESCE(s.gross_profit, 0) - COALESCE(e.total_expenses, 0))
             / NULLIF(COALESCE(s.net_revenue, 0), 0), 2)   AS operating_margin_pct
FROM months m
LEFT JOIN s ON s.month_start = m.month_start
LEFT JOIN e ON e.month_start = m.month_start;

-- ---------------------------------------------------------------------
-- Running stock balance per product, for the movement-history screen
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW erp.v_stock_ledger AS
SELECT m.movement_id,
       m.product_id,
       p.sku,
       p.name AS product_name,
       m.movement_date,
       m.movement_type,
       m.quantity,
       m.signed_quantity,
       m.unit_cost,
       m.reference_type,
       m.reference_id,
       SUM(m.signed_quantity) OVER (
           PARTITION BY m.product_id
           ORDER BY m.movement_date, m.movement_id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_balance
FROM erp.inventory_movements m
JOIN erp.products p ON p.product_id = m.product_id;
