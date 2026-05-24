/**
 * Kanban store — PostgreSQL backend
 *
 * Strategy: "document store" pattern.
 * The entire board state is stored as a single JSONB document in one row.
 * This keeps all domain logic in TypeScript, avoids schema migrations for
 * the fast-moving startup phase, and is trivially fast for a 3-person team.
 *
 * Schema:
 *   CREATE TABLE IF NOT EXISTS kanban_state (
 *     id      TEXT PRIMARY KEY DEFAULT 'main',
 *     state   JSONB NOT NULL,
 *     updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 * When DATABASE_URL is not set (local dev without Docker), falls back to
 * in-memory store so `npm run dev` works without any setup.
 */

import { Pool } from "pg";
import { demoState } from "@/domain/seed";
import type { StartupBoardState } from "@/domain/models";

// ===== Connection pool =====
// Singleton pattern safe for Next.js hot-reload
const globalForPg = globalThis as typeof globalThis & { __pgPool?: Pool };

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  if (!globalForPg.__pgPool) {
    globalForPg.__pgPool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: url.includes("localhost") || url.includes("postgres:") ? false : { rejectUnauthorized: false }
    });
    globalForPg.__pgPool.on("error", (err) => {
      console.error("[pg] pool error:", err.message);
    });
  }
  return globalForPg.__pgPool;
}

// ===== Schema bootstrap =====
let _schemaReady = false;

async function ensureSchema(pool: Pool): Promise<void> {
  if (_schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kanban_state (
      id      TEXT PRIMARY KEY DEFAULT 'main',
      state   JSONB NOT NULL,
      updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  _schemaReady = true;
}

// ===== In-memory fallback (dev without DATABASE_URL) =====
const _mem = globalThis as typeof globalThis & { __kanbanMemState?: StartupBoardState };

function memStore() {
  if (!_mem.__kanbanMemState) {
    _mem.__kanbanMemState = cloneState(demoState);
  }
  return {
    async read(): Promise<StartupBoardState> {
      return cloneState(_mem.__kanbanMemState ?? demoState);
    },
    async update(fn: (s: StartupBoardState) => StartupBoardState | Promise<StartupBoardState>): Promise<StartupBoardState> {
      const next = await fn(cloneState(_mem.__kanbanMemState ?? demoState));
      _mem.__kanbanMemState = cloneState(next);
      return cloneState(next);
    },
    async reset(): Promise<StartupBoardState> {
      _mem.__kanbanMemState = cloneState(demoState);
      return cloneState(_mem.__kanbanMemState);
    }
  };
}

// ===== PostgreSQL store =====
function pgStore(pool: Pool) {
  return {
    async read(): Promise<StartupBoardState> {
      await ensureSchema(pool);
      const result = await pool.query<{ state: StartupBoardState }>(
        "SELECT state FROM kanban_state WHERE id = 'main' LIMIT 1"
      );
      if (result.rows.length === 0) {
        // First boot — seed demo data
        await pool.query(
          "INSERT INTO kanban_state (id, state) VALUES ('main', $1) ON CONFLICT (id) DO NOTHING",
          [JSON.stringify(demoState)]
        );
        return cloneState(demoState);
      }
      return result.rows[0].state as StartupBoardState;
    },

    async update(fn: (s: StartupBoardState) => StartupBoardState | Promise<StartupBoardState>): Promise<StartupBoardState> {
      await ensureSchema(pool);

      // Serializable transaction for concurrent safety
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");

        const result = await client.query<{ state: StartupBoardState }>(
          "SELECT state FROM kanban_state WHERE id = 'main' FOR UPDATE LIMIT 1"
        );

        let current: StartupBoardState;
        if (result.rows.length === 0) {
          current = cloneState(demoState);
        } else {
          current = result.rows[0].state as StartupBoardState;
        }

        const next = await fn(current);

        await client.query(
          `INSERT INTO kanban_state (id, state, updated)
           VALUES ('main', $1, NOW())
           ON CONFLICT (id) DO UPDATE SET state = $1, updated = NOW()`,
          [JSON.stringify(next)]
        );

        await client.query("COMMIT");
        return cloneState(next);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async reset(): Promise<StartupBoardState> {
      await ensureSchema(pool);
      await pool.query(
        `INSERT INTO kanban_state (id, state, updated)
         VALUES ('main', $1, NOW())
         ON CONFLICT (id) DO UPDATE SET state = $1, updated = NOW()`,
        [JSON.stringify(demoState)]
      );
      return cloneState(demoState);
    }
  };
}

// ===== Public API =====
export type Store = ReturnType<typeof memStore>;

export function getKanbanStore(): Store {
  const pool = getPool();
  return pool ? pgStore(pool) : memStore();
}

function cloneState(state: StartupBoardState): StartupBoardState {
  return JSON.parse(JSON.stringify(state)) as StartupBoardState;
}
