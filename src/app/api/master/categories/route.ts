import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         c.category_id,
         c.name,
         c.description,
         c.is_active,
         COUNT(p.product_id) AS products_count
       FROM erp.categories c
       LEFT JOIN erp.products p ON p.category_id = c.category_id
       GROUP BY c.category_id, c.name, c.description, c.is_active
       ORDER BY c.name ASC`
    );

    const expenseCategories = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT expense_category_id, name, is_fixed_cost, description, is_active
       FROM erp.expense_categories ORDER BY name ASC`
    );

    return NextResponse.json({ categories, expenseCategories });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode === "USER") {
      return NextResponse.json(
        { error: "Forbidden: Staff users cannot manage categories" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || String(name).trim() === "") {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const cleanDesc = description ? String(description).trim() : null;

    // Check duplicate
    const existing = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT category_id FROM erp.categories WHERE LOWER(name) = LOWER($1)`,
      [cleanName]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `A category named '${cleanName}' already exists.` },
        { status: 409 }
      );
    }

    const inserted = await queryWithContext(
      user.userId,
      user.roleCode,
      `INSERT INTO erp.categories (name, description, is_active)
       VALUES ($1, $2, TRUE)
       RETURNING category_id, name, description, is_active, created_at`,
      [cleanName, cleanDesc]
    );

    return NextResponse.json({
      success: true,
      message: `Category '${cleanName}' created successfully.`,
      category: inserted[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: 500 }
    );
  }
}
