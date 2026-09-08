import { Pool, PoolClient } from "pg";

// Create a singleton pool connected as erp_app via DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export { pool };

/**
 * Executes a callback with a dedicated client where the request context
 * (app.user_id and app.role_code) is strictly set inside a transaction.
 * This guarantees that triggers, RLS policies, and controlled tool guards
 * have the authenticated session context.
 */
export async function withDbContext<T>(
  userId: number | string | null,
  roleCode: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (userId !== null && userId !== undefined) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [
        String(userId),
      ]);
    }
    await client.query("SELECT set_config('app.role_code', $1, true)", [
      roleCode,
    ]);

    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure on broken connection
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a single query with RLS context set for the connection.
 */
export async function queryWithContext<R = any>(
  userId: number | string | null,
  roleCode: string,
  sql: string,
  params: any[] = []
): Promise<R[]> {
  return withDbContext(userId, roleCode, async (client) => {
    const res = await client.query(sql, params);
    return res.rows as R[];
  });
}

/**
 * Execute a single query without context (used only for initial authentication lookup).
 */
export async function queryPublic<R = any>(
  sql: string,
  params: any[] = []
): Promise<R[]> {
  const res = await pool.query(sql, params);
  return res.rows as R[];
}
