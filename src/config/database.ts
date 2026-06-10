import { Pool, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL é obrigatória');
  }

  pool = new Pool({ connectionString: databaseUrl });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function querySingle<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: any[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(sql, params);
  } finally {
    client.release();
  }
}
