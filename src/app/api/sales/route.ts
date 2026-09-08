import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { withDbContext, queryWithContext } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let sql = `
      SELECT
        si.sales_invoice_id,
        si.invoice_no,
        si.invoice_date,
        si.customer_id,
        c.name AS customer_name,
        c.code AS customer_code,
        w.name AS warehouse_name,
        si.subtotal,
        si.discount_amount,
        si.tax_amount,
        si.total_amount,
        si.cogs_amount,
        si.amount_paid,
        si.payment_status,
        si.status,
        si.confirmed_at,
        u.full_name AS created_by_name,
        si.created_at
      FROM erp.sales_invoices si
      JOIN erp.customers c ON c.customer_id = si.customer_id
      LEFT JOIN erp.warehouses w ON w.warehouse_id = si.warehouse_id
      LEFT JOIN erp.users u ON u.user_id = si.created_by
    `;

    const params: any[] = [];
    if (status && status !== "ALL") {
      sql += ` WHERE si.status = $1`;
      params.push(status);
    }

    sql += ` ORDER BY si.sales_invoice_id DESC`;

    const invoices = await queryWithContext(user.userId, user.roleCode, sql, params);

    return NextResponse.json({ invoices });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sales invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      warehouseId,
      invoiceDate,
      notes,
      items,
      autoConfirm = false,
    } = body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Customer and at least one item are required." },
        { status: 400 }
      );
    }

    // Execute within transaction and context
    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      // 1. Generate unique invoice number
      const countRes = await client.query(
        "SELECT COUNT(*) AS total FROM erp.sales_invoices"
      );
      const nextSeq = Number(countRes.rows[0]?.total || 0) + 1;
      const invoiceNo = `SI-${String(nextSeq).padStart(4, "0")}-${Math.floor(
        100 + Math.random() * 900
      )}`;

      // Resolve warehouse if not provided
      let targetWarehouseId = warehouseId;
      if (!targetWarehouseId) {
        const whRes = await client.query(
          "SELECT warehouse_id FROM erp.warehouses WHERE is_default = TRUE LIMIT 1"
        );
        targetWarehouseId = whRes.rows[0]?.warehouse_id;
      }

      // 2. Insert invoice header with status = 'DRAFT'
      // Strictly do not write subtotal, tax_amount, total_amount, cogs_amount, etc.
      const invRes = await client.query(
        `INSERT INTO erp.sales_invoices
           (invoice_no, invoice_date, customer_id, warehouse_id, notes, created_by, status)
         VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, 'DRAFT')
         RETURNING sales_invoice_id, invoice_no`,
        [
          invoiceNo,
          invoiceDate || null,
          customerId,
          targetWarehouseId,
          notes || null,
          user.userId,
        ]
      );

      const invoiceId = invRes.rows[0].sales_invoice_id;

      // 3. Insert line items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(
          `INSERT INTO erp.sales_invoice_items
             (sales_invoice_id, line_no, product_id, quantity, unit_price, discount_percent, tax_percent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoiceId,
            i + 1,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.discountPercent || 0,
            item.taxPercent || 0,
          ]
        );
      }

      // 4. If autoConfirm requested, update status to CONFIRMED
      // This is what posts stock movements and snapshots COGS!
      if (autoConfirm) {
        await client.query(
          `UPDATE erp.sales_invoices
           SET status = 'CONFIRMED', confirmed_at = now()
           WHERE sales_invoice_id = $1`,
          [invoiceId]
        );
      }

      // Fetch the final trigger-computed invoice
      const finalRes = await client.query(
        `SELECT * FROM erp.sales_invoices WHERE sales_invoice_id = $1`,
        [invoiceId]
      );

      return finalRes.rows[0];
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create sales invoice" },
      { status: 500 }
    );
  }
}
