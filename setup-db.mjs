// Script para verificar quais tabelas já existem no Supabase.
// Uso: node setup-db.mjs
// Credenciais: lê VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY de .env.local/.env.

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local ou .env.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES = [
  'organizations', 'organization_members', 'profiles', 'clients', 'documents', 'projects', 'project_expenses',
  'custos_projeto', 'consignados', 'prestadores', 'suppliers',
  'contas_pagar', 'services', 'proposals', 'proposal_items',
  'recibos', 'schedule_events', 'inspections', 'non_conformities',
  'orcamento_resumo', 'orcamento_etapas'
];

async function checkTables() {
  console.log('🔍 Verificando tabelas no Supabase...\n');
  
  let existing = [];
  let missing = [];

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log(`❌ ${table} - NÃO EXISTE`);
        missing.push(table);
      } else if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        console.log(`✅ ${table} - EXISTE/PROTEGIDA (não exposta ao papel anon)`);
        existing.push(table);
      } else if (error.code === 'PGRST301' || error.message?.includes('policy')) {
        console.log(`✅ ${table} - EXISTE (RLS ativo)`);
        existing.push(table);
      } else {
        console.log(`⚠️  ${table} - ERRO: ${error.message?.substring(0, 60)}`);
        missing.push(table);
      }
    } else {
      console.log(`✅ ${table} - EXISTE (${data?.length || 0} registros)`);
      existing.push(table);
    }
  }

  console.log(`\n📊 Resumo: ${existing.length} existentes, ${missing.length} faltando`);
  if (missing.length > 0) {
    console.log('\n📋 Tabelas faltando:', missing.join(', '));
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
    console.log(`\nExecute o SQL em: https://app.supabase.com/project/${projectRef}/sql`);
  }
}

checkTables();
