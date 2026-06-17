import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL é obrigatória');
    process.exit(1);
  }

  const isLocalhost = /localhost|127\.0\.0\.1/.test(databaseUrl);
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
  });
  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Executando migration: ${file}`);
    try {
      await pool.query(sql);
      console.log(`  ✓ ${file} executada com sucesso`);
    } catch (error: any) {
      console.error(`  ✗ Erro em ${file}:`, error.message);
    }
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
