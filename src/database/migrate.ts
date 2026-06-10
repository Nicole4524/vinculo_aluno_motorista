import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function migrate() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Executando migration: ${file}`);
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`Erro em ${file}:`, error.message);
    } else {
      console.log(`  ✓ ${file} executada com sucesso`);
    }
  }
}

migrate().catch(console.error);
