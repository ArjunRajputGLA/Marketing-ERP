import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { withDbContext } from "@/lib/db";

export async function GET(
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

    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      // 1. Fetch invoice header
      const invRes = await client.query(
        `SELECT
           si.*,
           c.name AS customer_name,
           c.code AS customer_code,
           c.email AS customer_email,
           c.phone AS customer_phone,
           w.name AS warehouse_name,
           u.full_name AS created_by_name
         FROM erp.sales_invoices si
         JOIN erp.customers c ON c.customer_id = si.customer_id
         LEFT JOIN erp.warehouses w ON w.warehouse_id = si.warehouse_id
         LEFT JOIN erp.users u ON u.user_id = si.created_by
         WHERE si.sales_invoice_id = $1`,
        [invoiceId]
      );

      if (invRes.rows.length === 0) {
        return null;
      }

      const invoice = invRes.rows[0];

      // 2. Fetch invoice line items (with generated columns)
      const itemsRes = await client.query(
        `SELECT
           sii.*,
           p.name AS product_name,
           p.sku,
           p.unit
         FROM erp.sales_invoice_items sii
         JOIN erp.products p ON p.product_id = sii.product_id
         WHERE sii.sales_invoice_id = $1
         ORDER BY sii.line_no ASC`,
        [invoiceId]
      );

      // 3. Fetch invoice payment history
      const paymentsRes = await client.query(
        `SELECT
           p.*,
           u.full_name AS recorded_by_name
         FROM erp.payments p
         LEFT JOIN erp.users u ON u.user_id = p.created_by
         WHERE p.sales_invoice_id = $1
         ORDER BY p.payment_id DESC`,
        [invoiceId]
      );

      return {
        invoice,
        items: itemsRes.rows,
        payments: paymentsRes.rows,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sales invoice" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { action } = await request.json();

    if (!["CONFIRM", "CANCEL"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      if (action === "CONFIRM") {
        // Checking current status
        const chk = await client.query(
          `SELECT status FROM erp.sales_invoices WHERE sales_invoice_id = $1`,
          [invoiceId]
        );
        if (chk.rows[0]?.status !== "DRAFT") {
          throw new Error("Only DRAFT invoices can be confirmed.");
        }

        const res = await client.query(
          `UPDATE erp.sales_invoices
           SET status = 'CONFIRMED', confirmed_at = now()
           WHERE sales_invoice_id = $1
           RETURNING *`,
          [invoiceId]
        );
        return res.rows[0];
      } else if (action === "CANCEL") {
        const res = await client.query(
          `UPDATE erp.sales_invoices
           SET status = 'CANCELLED', cancelled_at = now()
           WHERE sales_invoice_id = $1
           RETURNING *`,
          [invoiceId]
        );
        return res.rows[0];
      }
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}
