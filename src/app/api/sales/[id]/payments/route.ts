import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { withDbContext } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const invoiceId = Number(id);
    const { amount, method = "CASH", referenceNo, paymentDate } = await request.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      // 1. Check if invoice exists and is CONFIRMED
      const invRes = await client.query(
        `SELECT sales_invoice_id, status, total_amount, amount_paid, payment_status
         FROM erp.sales_invoices WHERE sales_invoice_id = $1`,
        [invoiceId]
      );

      if (invRes.rows.length === 0) {
        throw new Error("Sales invoice not found");
      }

      if (invRes.rows[0].status !== "CONFIRMED") {
        throw new Error("Payments can only be recorded for CONFIRMED invoices.");
      }

      // 2. Generate unique payment number
      const payCount = await client.query("SELECT COUNT(*) FROM erp.payments");
      const payNo = `PAY-IN-${String(Number(payCount.rows[0].count) + 1).padStart(4, "0")}`;

      // 3. Insert payment.
      // Triggers (trg_payments_refresh) will automatically recompute amount_paid and payment_status on sales_invoices!
      const payRes = await client.query(
        `INSERT INTO erp.payments
           (payment_no, payment_date, direction, amount, method, sales_invoice_id, reference_no, created_by)
         VALUES ($1, COALESCE($2, CURRENT_DATE), 'IN', $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          payNo,
          paymentDate || null,
          amount,
          method,
          invoiceId,
          referenceNo || null,
          user.userId,
        ]
      );

      // Fetch the refreshed invoice state
      const refreshedInv = await client.query(
        `SELECT sales_invoice_id, total_amount, amount_paid, payment_status
         FROM erp.sales_invoices WHERE sales_invoice_id = $1`,
        [invoiceId]
      );

      return {
        payment: payRes.rows[0],
        invoice: refreshedInv.rows[0],
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}
