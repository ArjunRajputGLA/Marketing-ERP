import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call erp.recalculate_stock_on_hand(NULL)
    // Returns any product where cached stock_on_hand does not match ledger sum
    const driftRows = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         product_id,
         old_stock,
         new_stock
       FROM erp.recalculate_stock_on_hand(NULL)`
    );

    const isConsistent = driftRows.length === 0;

    return NextResponse.json({
      isConsistent,
      driftCount: driftRows.length,
      driftRows,
      checkedAt: new Date().toISOString(),
      message: isConsistent
        ? "Stock on hand cache is 100% consistent with the append-only inventory ledger. Zero drift detected."
        : `Drift detected in ${driftRows.length} product(s). Cache has been reconciled to ledger values.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to run stock consistency check" },
      { status: 500 }
    );
  }
}
