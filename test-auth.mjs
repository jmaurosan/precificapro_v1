// Teste completo de autenticação e RLS
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

async function testAuth() {
  const testEmail = `test_${Date.now()}@precificapro.com`;
  const testPassword = 'TestPass123!';
  const testName = 'Usuário Teste';

  console.log('🧪 Testando fluxo de autenticação...\n');
  console.log(`📧 Email de teste: ${testEmail}`);

  // 1. Teste de SignUp
  console.log('\n1️⃣ Testando SignUp...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: { data: { full_name: testName } }
  });

  if (signUpError) {
    console.log('❌ Erro no SignUp:', signUpError.message);
    return;
  }
  console.log('✅ SignUp OK! User ID:', signUpData.user?.id);

  // 2. Verificar se o profile foi criado automaticamente
  console.log('\n2️⃣ Verificando auto-criação de profile...');
  await new Promise(r => setTimeout(r, 2000)); // Aguardar trigger
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', signUpData.user?.id)
    .single();

  if (profileError) {
    console.log('⚠️  Profile não encontrado (pode ser delay do trigger):', profileError.message);
  } else {
    console.log('✅ Profile criado automaticamente!');
    console.log('   Nome:', profile.name);
    console.log('   Role:', profile.role);
    console.log('   Company:', profile.company_name);
  }

  // 3. Teste de RLS - inserir um cliente
  console.log('\n3️⃣ Testando RLS - inserindo cliente...');
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .insert([{
      nome: 'Cliente Teste',
      tipo: 'PF',
      cpf_cnpj: '123.456.789-00',
      email: 'cliente@teste.com',
      status: 'novo'
    }])
    .select();

  if (clientError) {
    console.log('❌ Erro ao inserir cliente:', clientError.message);
  } else {
    console.log('✅ Cliente inserido com RLS!', clientData);
  }

  // 4. Teste de Login
  console.log('\n4️⃣ Testando Login...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (loginError) {
    console.log('❌ Erro no Login:', loginError.message);
  } else {
    console.log('✅ Login OK!');
  }

  // 5. Verificar se consegue ler seus próprios clientes
  console.log('\n5️⃣ Verificando leitura de dados com RLS...');
  const { data: myClients, error: readError } = await supabase
    .from('clients')
    .select('*');

  if (readError) {
    console.log('❌ Erro ao ler clientes:', readError.message);
  } else {
    console.log(`✅ Leitura OK! Encontrados ${myClients?.length || 0} clientes`);
  }

  // 6. Limpeza - deletar usuário de teste
  console.log('\n6️⃣ Limpando dados de teste...');
  if (clientData?.[0]?.id) {
    await supabase.from('clients').delete().eq('id', clientData[0].id);
    console.log('   Cliente removido');
  }
  await supabase.auth.signOut();
  console.log('   Logout realizado');

  console.log('\n✨ Teste concluído!');
}

testAuth();
