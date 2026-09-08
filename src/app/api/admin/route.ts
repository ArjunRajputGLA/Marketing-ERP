import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can access this resource" },
        { status: 403 }
      );
    }

    const users = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT user_id, username, email, full_name, role_code, role_name, is_active, last_login_at, created_at
       FROM erp.v_users
       ORDER BY user_id ASC`
    );

    const auditLogs = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         a.log_id,
         a.table_name,
         a.operation,
         a.record_id,
         a.changed_by_user_id,
         u.username AS changed_by_username,
         a.changed_by_role,
         a.old_values,
         a.new_values,
         a.created_at
       FROM erp.audit_log a
       LEFT JOIN erp.users u ON u.user_id = a.changed_by_user_id
       ORDER BY a.log_id DESC
       LIMIT 50`
    );

    return NextResponse.json({ users, auditLogs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}
