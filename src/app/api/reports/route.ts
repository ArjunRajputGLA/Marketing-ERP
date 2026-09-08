import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode === "USER") {
      return NextResponse.json(
        { error: "Forbidden: Staff cannot access analytics views" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "profit";

    let rows: any[] = [];

    if (view === "profit") {
      rows = await queryWithContext(
        user.userId,
        user.roleCode,
        `SELECT
           TO_CHAR(month_start, 'YYYY-MM') AS month_key,
           month_start,
           invoice_count,
           net_revenue,
           total_discount,
           cogs,
           gross_profit,
           operating_expenses AS total_expenses,
           operating_profit,
           operating_margin_pct AS gross_margin_pct
         FROM erp.v_profit_monthly
         ORDER BY month_start DESC`
      );
    } else if (view === "product") {
      rows = await queryWithContext(
        user.userId,
        user.roleCode,
        `SELECT
           product_id,
           sku,
           product_name,
           category_name,
           units_sold,
           net_revenue,
           cogs,
           gross_profit,
           gross_margin_pct,
           avg_selling_price
         FROM erp.v_product_performance
         ORDER BY net_revenue DESC`
      );
    } else if (view === "customer") {
      rows = await queryWithContext(
        user.userId,
        user.roleCode,
        `SELECT
           customer_id,
           code,
           customer_name,
           customer_type,
           confirmed_invoices,
           net_revenue,
           total_paid,
           outstanding_balance,
           first_sale,
           last_sale
         FROM erp.v_customer_summary
         ORDER BY net_revenue DESC`
      );
    } else if (view === "supplier") {
      rows = await queryWithContext(
        user.userId,
        user.roleCode,
        `SELECT
           supplier_id,
           code,
           supplier_name,
           invoice_count,
           total_spend,
           total_paid,
           outstanding_balance,
           first_purchase,
           last_purchase
         FROM erp.v_supplier_summary
         ORDER BY total_spend DESC`
      );
    }

    return NextResponse.json({ view, rows });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch reporting view" },
      { status: 500 }
    );
  }
}
