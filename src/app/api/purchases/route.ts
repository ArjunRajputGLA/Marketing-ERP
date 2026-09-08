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
        pi.purchase_invoice_id,
        pi.invoice_no,
        pi.supplier_invoice_ref,
        pi.invoice_date,
        pi.supplier_id,
        s.name AS supplier_name,
        s.code AS supplier_code,
        w.name AS warehouse_name,
        pi.subtotal,
        pi.discount_amount,
        pi.tax_amount,
        pi.total_amount,
        pi.amount_paid,
        pi.payment_status,
        pi.status,
        pi.confirmed_at,
        u.full_name AS created_by_name,
        pi.created_at
      FROM erp.purchase_invoices pi
      JOIN erp.suppliers s ON s.supplier_id = pi.supplier_id
      LEFT JOIN erp.warehouses w ON w.warehouse_id = pi.warehouse_id
      LEFT JOIN erp.users u ON u.user_id = pi.created_by
    `;

    const params: any[] = [];
    if (status && status !== "ALL") {
      sql += ` WHERE pi.status = $1`;
      params.push(status);
    }

    sql += ` ORDER BY pi.purchase_invoice_id DESC`;

    const invoices = await queryWithContext(user.userId, user.roleCode, sql, params);

    return NextResponse.json({ invoices });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase invoices" },
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
      supplierId,
      warehouseId,
      invoiceDate,
      supplierInvoiceRef,
      notes,
      items,
      autoConfirm = false,
    } = body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Supplier and at least one line item are required." },
        { status: 400 }
      );
    }

    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      // 1. Generate unique invoice number
      const countRes = await client.query(
        "SELECT COUNT(*) AS total FROM erp.purchase_invoices"
      );
      const nextSeq = Number(countRes.rows[0]?.total || 0) + 1;
      const invoiceNo = `PI-${String(nextSeq).padStart(4, "0")}-${Math.floor(
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

      // 2. Insert header as 'DRAFT'
      const invRes = await client.query(
        `INSERT INTO erp.purchase_invoices
           (invoice_no, supplier_invoice_ref, invoice_date, supplier_id, warehouse_id, notes, created_by, status)
         VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, $6, $7, 'DRAFT')
         RETURNING purchase_invoice_id, invoice_no`,
        [
          invoiceNo,
          supplierInvoiceRef || null,
          invoiceDate || null,
          supplierId,
          targetWarehouseId,
          notes || null,
          user.userId,
        ]
      );

      const invoiceId = invRes.rows[0].purchase_invoice_id;

      // 3. Insert line items
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await client.query(
          `INSERT INTO erp.purchase_invoice_items
             (purchase_invoice_id, line_no, product_id, quantity, unit_cost, discount_percent, tax_percent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoiceId,
            i + 1,
            it.productId,
            it.quantity,
            it.unitCost,
            it.discountPercent || 0,
            it.taxPercent || 0,
          ]
        );
      }

      // 4. Confirm if requested: posts stock into warehouse & updates moving average cost
      if (autoConfirm) {
        await client.query(
          `UPDATE erp.purchase_invoices
           SET status = 'CONFIRMED', confirmed_at = now()
           WHERE purchase_invoice_id = $1`,
          [invoiceId]
        );
      }

      const finalRes = await client.query(
        `SELECT * FROM erp.purchase_invoices WHERE purchase_invoice_id = $1`,
        [invoiceId]
      );

      return finalRes.rows[0];
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create purchase invoice" },
      { status: 500 }
    );
  }
}
