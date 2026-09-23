import { mkdir } from "node:fs/promises";
import path from "node:path";

export interface Sql {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
interface Database extends Sql {
  transaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const schema = [
  `CREATE TABLE IF NOT EXISTS commerce_lock (id integer PRIMARY KEY)`,
  `INSERT INTO commerce_lock VALUES (1) ON CONFLICT DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS commerce_users (id text PRIMARY KEY, email text UNIQUE NOT NULL, created_at bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_sessions (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES commerce_users(id), expires_at bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_codes (id text PRIMARY KEY, email text NOT NULL, code_hash text NOT NULL, expires_at bigint NOT NULL, attempts integer NOT NULL DEFAULT 0, consumed boolean NOT NULL DEFAULT false)`,
  `CREATE TABLE IF NOT EXISTS commerce_limits (id text PRIMARY KEY, count integer NOT NULL, reset_at bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_settings (id integer PRIMARY KEY, value jsonb NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_projects (id text PRIMARY KEY, user_id text NOT NULL REFERENCES commerce_users(id), local_id text NOT NULL, name text NOT NULL, payload jsonb NOT NULL, version integer NOT NULL, updated_at bigint NOT NULL, UNIQUE(user_id, local_id))`,
  `CREATE TABLE IF NOT EXISTS commerce_versions (id text PRIMARY KEY, project_id text NOT NULL REFERENCES commerce_projects(id), version integer NOT NULL, payload jsonb NOT NULL, created_at bigint NOT NULL, UNIQUE(project_id, version))`,
  `CREATE TABLE IF NOT EXISTS commerce_documents (id text PRIMARY KEY, user_id text NOT NULL REFERENCES commerce_users(id), project_id text NOT NULL REFERENCES commerce_projects(id), format text NOT NULL, payload jsonb NOT NULL, created_at bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_templates (id text PRIMARY KEY, user_id text NOT NULL REFERENCES commerce_users(id), name text NOT NULL, payload jsonb NOT NULL, updated_at bigint NOT NULL)`,
  `CREATE SEQUENCE IF NOT EXISTS commerce_invoice_seq START 100001`,
  `CREATE TABLE IF NOT EXISTS commerce_orders (id text PRIMARY KEY, invoice bigint NOT NULL UNIQUE DEFAULT nextval('commerce_invoice_seq'), user_id text NOT NULL REFERENCES commerce_users(id), project_id text REFERENCES commerce_projects(id), kind text NOT NULL CHECK (kind IN ('project_pack','pro_month')), amount integer NOT NULL CHECK(amount > 0), refunded integer NOT NULL DEFAULT 0 CHECK(refunded >= 0 AND refunded <= amount), state text NOT NULL DEFAULT 'pending', mode text NOT NULL, created_at bigint NOT NULL, paid_at bigint, access_start bigint, access_end bigint, recurring_consent boolean NOT NULL DEFAULT false, settings_revision integer NOT NULL, provider_operation text)`,
  `ALTER TABLE commerce_documents ADD COLUMN IF NOT EXISTS grant_order_id text REFERENCES commerce_orders(id)`,
  `CREATE TABLE IF NOT EXISTS commerce_subscriptions (user_id text PRIMARY KEY REFERENCES commerce_users(id), reference_invoice bigint, auto_renew boolean NOT NULL DEFAULT false, consent_version text, consent_at bigint, canceled_at bigint, next_order_id text REFERENCES commerce_orders(id))`,
  `CREATE TABLE IF NOT EXISTS commerce_payment_events (id text PRIMARY KEY, order_id text NOT NULL REFERENCES commerce_orders(id), kind text NOT NULL, amount integer NOT NULL, created_at bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_refunds (id text PRIMARY KEY, order_id text NOT NULL REFERENCES commerce_orders(id), amount integer NOT NULL CHECK(amount > 0), state text NOT NULL, provider_request text, created_at bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_audit (id text PRIMARY KEY, actor text NOT NULL, action text NOT NULL, detail jsonb NOT NULL, created_at bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_funnel (id text PRIMARY KEY, event text NOT NULL, source text NOT NULL, detail jsonb NOT NULL, mode text NOT NULL, created_at bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS commerce_affiliate_sales (provider text NOT NULL, reference text NOT NULL, state text NOT NULL, commission integer NOT NULL CHECK(commission >= 0), report_reference text NOT NULL, mode text NOT NULL, updated_at bigint NOT NULL, PRIMARY KEY(provider,reference,mode))`,
  `CREATE TABLE IF NOT EXISTS commerce_ai_usage (id text PRIMARY KEY, user_id text NOT NULL REFERENCES commerce_users(id), period text NOT NULL, reserved integer NOT NULL, cost integer, state text NOT NULL, created_at bigint NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS commerce_orders_user_idx ON commerce_orders(user_id, state)`,
  `CREATE INDEX IF NOT EXISTS commerce_documents_user_idx ON commerce_documents(user_id, project_id)`,
];

const cache = globalThis as unknown as { masterokCommerceDb?: Promise<Database> };

async function openDatabase(): Promise<Database> {
  let db: Database;
  if (process.env.COMMERCE_DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.COMMERCE_DATABASE_URL, max: 5 });
    db = {
      query: async <T>(sql: string, params?: unknown[]) => ({ rows: (await pool.query(sql, params)).rows as T[] }),
      transaction: async <T>(fn: (sql: Sql) => Promise<T>) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT id FROM commerce_lock WHERE id=1 FOR UPDATE");
          const result = await fn({ query: async <R>(sql: string, params?: unknown[]) => ({ rows: (await client.query(sql, params)).rows as R[] }) });
          await client.query("COMMIT");
          return result;
        } catch (error) { await client.query("ROLLBACK"); throw error; }
        finally { client.release(); }
      },
      close: () => pool.end(),
    };
  } else {
    if (process.env.MONETIZATION_MODE !== "local") throw new Error("COMMERCE_DATABASE_URL is required outside local simulation");
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.COMMERCE_LOCAL_DATA_DIR ?? path.join(process.cwd(), ".commerce-data", "local");
    if (dir !== "memory://") await mkdir(dir, { recursive: true });
    const pg = new PGlite(dir === "memory://" ? undefined : dir);
    await pg.waitReady;
    const wrap = (queryable: Pick<typeof pg, "query">): Sql => ({
      query: async <T>(sql: string, params?: unknown[]) => ({ rows: (await queryable.query(sql, params)).rows as T[] }),
    });
    db = { ...wrap(pg), transaction: (fn) => pg.transaction((tx) => fn(wrap(tx))), close: () => pg.close() };
  }
  for (const statement of schema) await db.query(statement);
  return db;
}

export function database(): Promise<Database> {
  cache.masterokCommerceDb ??= openDatabase().catch((error) => { cache.masterokCommerceDb = undefined; throw error; });
  return cache.masterokCommerceDb;
}

export async function closeCommerceDatabase(): Promise<void> {
  const current = cache.masterokCommerceDb;
  cache.masterokCommerceDb = undefined;
  if (current) await (await current).close();
}
