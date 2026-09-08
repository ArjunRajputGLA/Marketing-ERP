import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode === "USER") {
      return NextResponse.json(
        { error: "Forbidden: Staff cannot access payments ledger" },
        { status: 403 }
      );
    }

    const payments = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         p.payment_id,
         p.payment_no,
         p.payment_date,
         p.direction,
         p.amount,
         p.method,
         p.reference_no,
         p.sales_invoice_id,
         si.invoice_no AS sales_invoice_no,
         c.name AS customer_name,
         p.purchase_invoice_id,
         pi.invoice_no AS purchase_invoice_no,
         s.name AS supplier_name,
         u.full_name AS recorded_by_name,
         p.created_at
       FROM erp.payments p
       LEFT JOIN erp.sales_invoices si ON si.sales_invoice_id = p.sales_invoice_id
       LEFT JOIN erp.customers c ON c.customer_id = si.customer_id
       LEFT JOIN erp.purchase_invoices pi ON pi.purchase_invoice_id = p.purchase_invoice_id
       LEFT JOIN erp.suppliers s ON s.supplier_id = pi.supplier_id
       LEFT JOIN erp.users u ON u.user_id = p.created_by
       ORDER BY p.payment_id DESC`
    );

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
