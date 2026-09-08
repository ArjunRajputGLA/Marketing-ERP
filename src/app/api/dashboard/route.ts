import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Overall stats from sales and products
    const salesStats = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         COALESCE(SUM(subtotal - discount_amount), 0) AS total_revenue,
         COALESCE(SUM(cogs_amount), 0) AS total_cogs,
         COALESCE(SUM(subtotal - discount_amount - cogs_amount), 0) AS gross_profit,
         COUNT(*) AS confirmed_invoices
       FROM erp.sales_invoices
       WHERE status = 'CONFIRMED'`
    );

    // 2. Total expenses (only visible to ADMIN and MANAGER)
    let totalExpenses = 0;
    if (user.roleCode !== "USER") {
      const expRes = await queryWithContext(
        user.userId,
        user.roleCode,
        `SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM erp.expenses`
      );
      totalExpenses = Number(expRes[0]?.total_expenses || 0);
    }

    // 3. Low stock count
    const stockStats = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         COUNT(*) AS total_products,
         COUNT(*) FILTER (WHERE stock_on_hand <= reorder_level) AS low_stock_count,
         COUNT(*) FILTER (WHERE stock_on_hand = 0) AS out_of_stock_count
       FROM erp.products`
    );

    // 4. Monthly profit history from deterministic view (if permitted)
    let monthlyTrends: any[] = [];
    if (user.roleCode !== "USER") {
      monthlyTrends = await queryWithContext(
        user.userId,
        user.roleCode,
        `SELECT
           TO_CHAR(month_start, 'Mon YYYY') AS month,
           month_start,
           net_revenue,
           cogs,
           gross_profit,
           operating_expenses AS total_expenses,
           operating_profit,
           operating_margin_pct AS gross_margin_pct
         FROM erp.v_profit_monthly
         ORDER BY month_start DESC
         LIMIT 6`
      );
    } else {
      // For staff, return monthly sales without expense/profit leakage
      monthlyTrends = await queryWithContext(
        user.userId,
        user.roleCode,
        `SELECT
           TO_CHAR(month_start, 'Mon YYYY') AS month,
           month_start,
           net_revenue,
           cogs,
           invoice_count
         FROM erp.v_sales_monthly
         ORDER BY month_start DESC
         LIMIT 6`
      );
    }

    // 5. Recent Sales Invoices
    const recentSales = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         si.sales_invoice_id,
         si.invoice_no,
         si.invoice_date,
         c.name AS customer_name,
         si.total_amount,
         si.payment_status,
         si.status
       FROM erp.sales_invoices si
       JOIN erp.customers c ON c.customer_id = si.customer_id
       ORDER BY si.sales_invoice_id DESC
       LIMIT 5`
    );

    // 6. Products with low stock
    const lowStockProducts = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         p.product_id,
         p.sku,
         p.name,
         c.name AS category_name,
         p.stock_on_hand,
         p.reorder_level,
         p.cost_price,
         p.selling_price
       FROM erp.products p
       LEFT JOIN erp.categories c ON c.category_id = p.category_id
       WHERE p.stock_on_hand <= p.reorder_level
       ORDER BY p.stock_on_hand ASC
       LIMIT 5`
    );

    const rev = Number(salesStats[0]?.total_revenue || 0);
    const cogs = Number(salesStats[0]?.total_cogs || 0);
    const gp = Number(salesStats[0]?.gross_profit || 0);

    return NextResponse.json({
      stats: {
        totalRevenue: rev,
        totalCogs: cogs,
        grossProfit: gp,
        operatingProfit: gp - totalExpenses,
        totalExpenses: totalExpenses,
        confirmedInvoices: Number(salesStats[0]?.confirmed_invoices || 0),
        totalProducts: Number(stockStats[0]?.total_products || 0),
        lowStockCount: Number(stockStats[0]?.low_stock_count || 0),
        outOfStockCount: Number(stockStats[0]?.out_of_stock_count || 0),
      },
      monthlyTrends: monthlyTrends.reverse(),
      recentSales,
      lowStockProducts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
