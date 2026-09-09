import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
         a.audit_id,
         a.entity_table AS table_name,
         a.action,
         a.entity_id AS record_id,
         a.actor_user_id AS changed_by_user_id,
         u.username AS changed_by_username,
         a.actor_role AS user_role,
         a.old_values,
         a.new_values,
         a.occurred_at AS created_at
       FROM erp.audit_log a
       LEFT JOIN erp.users u ON u.user_id = a.actor_user_id
       ORDER BY a.audit_id DESC
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

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.roleCode !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can create new users" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, email, fullName, password, roleCode } = body;

    if (!username || !email || !fullName || !password || !roleCode) {
      return NextResponse.json(
        { error: "All fields (Full Name, Username, Email, Password, Role) are required." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanFullName = String(fullName).trim();
    const targetRole = String(roleCode).trim().toUpperCase();

    const validRoles = ["ADMIN", "MANAGER", "USER"];
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json(
        { error: `Invalid role selected. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check duplicate username or email
    const existing = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT username, email FROM erp.users WHERE username = $1 OR email = $2`,
      [cleanUsername, cleanEmail]
    );

    if (existing.length > 0) {
      if (existing[0].username === cleanUsername) {
        return NextResponse.json(
          { error: `A user with username '${cleanUsername}' already exists.` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `A user with email '${cleanEmail}' already exists.` },
        { status: 409 }
      );
    }

    // Look up role_id
    const roleRows = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT role_id, name FROM erp.roles WHERE code = $1`,
      [targetRole]
    );

    if (roleRows.length === 0) {
      return NextResponse.json(
        { error: `Role '${targetRole}' not found in database.` },
        { status: 400 }
      );
    }

    const roleId = roleRows[0].role_id;

    // Hash password with bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user into erp.users
    const inserted = await queryWithContext(
      user.userId,
      user.roleCode,
      `INSERT INTO erp.users (username, email, full_name, password_hash, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING user_id, username, email, full_name, role_id, is_active, created_at`,
      [cleanUsername, cleanEmail, cleanFullName, passwordHash, roleId]
    );

    const newUser = inserted[0];

    // Record in audit log
    try {
      await queryWithContext(
        user.userId,
        user.roleCode,
        `INSERT INTO erp.audit_log (
           actor_user_id, actor_role, action, entity_schema, entity_table, entity_id, new_values
         ) VALUES ($1, $2, 'INSERT', 'erp', 'users', $3, $4)`,
        [
          user.userId,
          user.roleCode,
          newUser.user_id,
          JSON.stringify({
            username: cleanUsername,
            email: cleanEmail,
            full_name: cleanFullName,
            role_code: targetRole,
          }),
        ]
      );
    } catch (auditErr) {
      console.error("Audit log insertion non-fatal error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `User '${cleanUsername}' (${targetRole}) created successfully.`,
      user: {
        userId: newUser.user_id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        roleCode: targetRole,
        roleName: roleRows[0].name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
