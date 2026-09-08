import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext, withDbContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const suppliers = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         s.supplier_id,
         s.code,
         s.name,
         s.contact_person,
         s.email,
         s.phone,
         s.lead_time_days,
         s.is_active,
         s.created_at
       FROM erp.suppliers s
       ORDER BY s.name ASC`
    );

    return NextResponse.json({ suppliers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode === "USER") {
      return NextResponse.json(
        { error: "Forbidden: Staff cannot create suppliers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, name, contactPerson, email, phone, leadTimeDays = 7 } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and Name are required" }, { status: 400 });
    }

    const result = await withDbContext(user.userId, user.roleCode, async (client) => {
      const res = await client.query(
        `INSERT INTO erp.suppliers
           (code, name, contact_person, email, phone, lead_time_days, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [code, name, contactPerson || null, email || null, phone || null, leadTimeDays, user.userId]
      );
      return res.rows[0];
    });

    return NextResponse.json({ success: true, supplier: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create supplier" },
      { status: 500 }
    );
  }
}
