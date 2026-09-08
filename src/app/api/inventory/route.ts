import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Live stock from products
    const products = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         p.product_id,
         p.sku,
         p.name,
         c.name AS category_name,
         p.unit,
         p.cost_price,
         p.selling_price,
         p.stock_on_hand,
         p.reorder_level,
         CASE
           WHEN p.stock_on_hand <= 0 THEN 'OUT_OF_STOCK'
           WHEN p.stock_on_hand <= p.reorder_level THEN 'LOW_STOCK'
           ELSE 'OPTIMAL'
         END AS stock_status
       FROM erp.products p
       LEFT JOIN erp.categories c ON c.category_id = p.category_id
       ORDER BY p.name ASC`
    );

    // 2. Append-only movements ledger (from erp.inventory_movements)
    const ledger = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         im.movement_id,
         im.movement_date,
         im.movement_type,
         im.product_id,
         p.name AS product_name,
         p.sku,
         im.warehouse_id,
         w.name AS warehouse_name,
         im.quantity,
         im.unit_cost,
         im.sales_invoice_id,
         si.invoice_no AS sales_invoice_no,
         im.purchase_invoice_id,
         pi.invoice_no AS purchase_invoice_no,
         im.notes,
         u.full_name AS created_by_name,
         im.created_at
       FROM erp.inventory_movements im
       JOIN erp.products p ON p.product_id = im.product_id
       LEFT JOIN erp.warehouses w ON w.warehouse_id = im.warehouse_id
       LEFT JOIN erp.sales_invoices si ON si.sales_invoice_id = im.sales_invoice_id
       LEFT JOIN erp.purchase_invoices pi ON pi.purchase_invoice_id = im.purchase_invoice_id
       LEFT JOIN erp.users u ON u.user_id = im.created_by
       ORDER BY im.movement_id DESC
       LIMIT 50`
    );

    return NextResponse.json({ products, ledger });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory data" },
      { status: 500 }
    );
  }
}
