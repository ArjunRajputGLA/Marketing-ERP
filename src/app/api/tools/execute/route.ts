import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { withDbContext } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { toolName, params } = await request.json();

    const allowedTools: Record<string, { scope: string; sql: string }> = {
      get_sales_summary: {
        scope: "SALES",
        sql: "SELECT * FROM tools.get_sales_summary($1, $2)",
      },
      get_profit_breakdown: {
        scope: "FINANCE",
        sql: "SELECT * FROM tools.get_profit_breakdown($1, $2)",
      },
      compare_periods: {
        scope: "FINANCE",
        sql: "SELECT * FROM tools.compare_periods($1, $2, $3, $4)",
      },
      get_stockout_risk: {
        scope: "INVENTORY",
        sql: "SELECT * FROM tools.get_stockout_risk($1)",
      },
      get_inventory_status: {
        scope: "INVENTORY",
        sql: "SELECT * FROM tools.get_inventory_status($1)",
      },
      get_discount_analysis: {
        scope: "SALES",
        sql: "SELECT * FROM tools.get_discount_analysis($1, $2)",
      },
      get_supplier_price_changes: {
        scope: "SUPPLIER",
        sql: "SELECT * FROM tools.get_supplier_price_changes($1, $2, $3, $4, $5)",
      },
    };

    if (!allowedTools[toolName]) {
      return NextResponse.json(
        { error: `Tool ${toolName} is not in the controlled whitelist.` },
        { status: 400 }
      );
    }

    const target = allowedTools[toolName];
    const startTime = Date.now();

    try {
      const rows = await withDbContext(user.userId, user.roleCode, async (client) => {
        const res = await client.query(target.sql, params || []);
        return res.rows;
      });

      const elapsedMs = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        toolName,
        scope: target.scope,
        callerRole: user.roleCode,
        executionTimeMs: elapsedMs,
        rows,
      });
    } catch (err: any) {
      const elapsedMs = Date.now() - startTime;
      const isAuthError =
        err.code === "42501" || (err.message && err.message.includes("DENIED"));

      return NextResponse.json(
        {
          success: false,
          toolName,
          scope: target.scope,
          callerRole: user.roleCode,
          executionTimeMs: elapsedMs,
          isDeniedByDatabaseGuard: isAuthError,
          error: err.message,
          code: err.code,
        },
        { status: isAuthError ? 403 : 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute controlled tool" },
      { status: 500 }
    );
  }
}
