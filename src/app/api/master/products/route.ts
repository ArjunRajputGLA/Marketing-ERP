import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext, withDbContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         p.product_id,
         p.sku,
         p.name,
         p.description,
         p.category_id,
         c.name AS category_name,
         p.unit,
         p.cost_price,
         p.selling_price,
         p.reorder_level,
         p.stock_on_hand,
         p.is_active,
         p.created_at
       FROM erp.products p
       LEFT JOIN erp.categories c ON c.category_id = p.category_id
       ORDER BY p.name ASC`
    );

    return NextResponse.json({ products });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode === "USER") {
      return NextResponse.json(
        { error: "Forbidden: Staff cannot create products" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      sku,
      name,
      description,
      categoryId,
      unit = "PCS",
      costPrice = 0,
      sellingPrice = 0,
      reorderLevel = 10,
    } = body;

    if (!sku || !name || !categoryId) {
      return NextResponse.json(
        { error: "SKU, Name, and Category are required." },
        { status: 400 }
      );
    }

    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      const res = await client.query(
        `INSERT INTO erp.products
           (sku, name, description, category_id, unit, cost_price, selling_price, reorder_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [sku, name, description || null, categoryId, unit, costPrice, sellingPrice, reorderLevel]
      );
      return res.rows[0];
    });

    return NextResponse.json({ success: true, product: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
