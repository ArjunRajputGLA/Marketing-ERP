import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext, withDbContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode === "USER") {
      return NextResponse.json(
        { error: "Forbidden: Staff cannot access finance records" },
        { status: 403 }
      );
    }

    const expenses = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         e.expense_id,
         e.expense_no,
         e.expense_date,
         e.amount,
         e.description,
         e.vendor_name,
         e.payment_method,
         e.reference_no,
         ec.name AS category_name,
         ec.is_fixed_cost,
         u.full_name AS created_by_name,
         e.created_at
       FROM erp.expenses e
       JOIN erp.expense_categories ec ON ec.expense_category_id = e.expense_category_id
       LEFT JOIN erp.users u ON u.user_id = e.created_by
       ORDER BY e.expense_id DESC`
    );

    return NextResponse.json({ expenses });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode === "USER") {
      return NextResponse.json(
        { error: "Forbidden: Staff cannot record expenses" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      expenseCategoryId,
      amount,
      expenseDate,
      description,
      vendorName,
      paymentMethod = "BANK_TRANSFER",
      referenceNo,
    } = body;

    if (!expenseCategoryId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Category and valid positive amount are required." },
        { status: 400 }
      );
    }

    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      const countRes = await client.query("SELECT COUNT(*) FROM erp.expenses");
      const expNo = `EXP-${String(Number(countRes.rows[0].count) + 1).padStart(4, "0")}`;

      const res = await client.query(
        `INSERT INTO erp.expenses
           (expense_no, expense_date, expense_category_id, amount, description, vendor_name, payment_method, reference_no, created_by)
         VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          expNo,
          expenseDate || null,
          expenseCategoryId,
          amount,
          description || null,
          vendorName || null,
          paymentMethod,
          referenceNo || null,
          user.userId,
        ]
      );
      return res.rows[0];
    });

    return NextResponse.json({ success: true, expense: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create expense" },
      { status: 500 }
    );
  }
}
