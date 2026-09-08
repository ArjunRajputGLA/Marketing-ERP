import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { queryPublic } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "marketing_erp_glau_decision_support_secret_2026_jwt"
);

export const COOKIE_NAME = "erp_session";

export interface SessionUser {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  roleCode: "ADMIN" | "MANAGER" | "USER";
  roleName: string;
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      roleCode: payload.roleCode as "ADMIN" | "MANAGER" | "USER",
      roleName: payload.roleName as string,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function authenticateUser(username: string, plainPassword: string): Promise<SessionUser | null> {
  const users = await queryPublic(
    `SELECT u.user_id, u.username, u.email, u.full_name, u.password_hash, u.is_active,
            r.code AS role_code, r.name AS role_name
     FROM erp.users u
     JOIN erp.roles r ON r.role_id = u.role_id
     WHERE u.username = $1 AND u.is_active = TRUE`,
    [username]
  );

  if (!users || users.length === 0) {
    return null;
  }

  const user = users[0];
  const isValid = await bcrypt.compare(plainPassword, user.password_hash);
  if (!isValid) {
    return null;
  }

  // Update last_login_at
  try {
    await queryPublic("UPDATE erp.users SET last_login_at = now() WHERE user_id = $1", [user.user_id]);
  } catch {
    // Non-fatal
  }

  return {
    userId: Number(user.user_id),
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    roleCode: user.role_code,
    roleName: user.role_name,
  };
}
