import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext, withDbContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         c.customer_id,
         c.code,
         c.name,
         c.email,
         c.phone,
         c.customer_type,
         c.credit_limit,
         c.is_active,
         c.created_at,
         u.full_name AS created_by_name
       FROM erp.customers c
       LEFT JOIN erp.users u ON u.user_id = c.created_by
       ORDER BY c.name ASC`
    );

    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch customers" },
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
    const { code, name, email, phone, customerType = "RETAIL", creditLimit = 0 } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and Name are required" }, { status: 400 });
    }

    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      const res = await client.query(
        `INSERT INTO erp.customers
           (code, name, email, phone, customer_type, credit_limit, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [code, name, email || null, phone || null, customerType, creditLimit, user.userId]
      );
      return res.rows[0];
    });

    return NextResponse.json({ success: true, customer: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create customer" },
      { status: 500 }
    );
  }
}
