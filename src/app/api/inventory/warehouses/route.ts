import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const warehouses = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         w.warehouse_id,
         w.code,
         w.name,
         w.location,
         w.is_default,
         w.is_active,
         w.created_at,
         COUNT(DISTINCT im.product_id) AS stocked_products_count,
         COALESCE(SUM(im.signed_quantity), 0) AS total_units_stored
       FROM erp.warehouses w
       LEFT JOIN erp.inventory_movements im ON im.warehouse_id = w.warehouse_id
       GROUP BY w.warehouse_id, w.code, w.name, w.location, w.is_default, w.is_active, w.created_at
       ORDER BY w.warehouse_id ASC`
    );

    return NextResponse.json({ warehouses });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode === "USER") {
      return NextResponse.json(
        { error: "Forbidden: Staff users cannot manage warehouses" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { code, name, location, isDefault } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "Warehouse Code and Facility Name are required." },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanName = String(name).trim();
    const cleanLocation = location ? String(location).trim() : null;

    // Check duplicate code
    const existing = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT warehouse_id FROM erp.warehouses WHERE code = $1`,
      [cleanCode]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `A warehouse with code '${cleanCode}' already exists.` },
        { status: 409 }
      );
    }

    if (isDefault) {
      // Clear existing default
      await queryWithContext(
        user.userId,
        user.roleCode,
        `UPDATE erp.warehouses SET is_default = FALSE WHERE is_default = TRUE`
      );
    }

    const inserted = await queryWithContext(
      user.userId,
      user.roleCode,
      `INSERT INTO erp.warehouses (code, name, location, is_default, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING warehouse_id, code, name, location, is_default, is_active, created_at`,
      [cleanCode, cleanName, cleanLocation, Boolean(isDefault)]
    );

    return NextResponse.json({
      success: true,
      message: `Warehouse '${cleanName}' created successfully.`,
      warehouse: inserted[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create warehouse" },
      { status: 500 }
    );
  }
}
