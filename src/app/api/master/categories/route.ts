import { NextResponse } from "next/server";
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
      `SELECT category_id, name, description, is_active FROM erp.categories ORDER BY name ASC`
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
