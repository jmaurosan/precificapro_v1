import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: exemplo-api-externa
 * 
 * Esta função serve como proxy seguro para chamadas a APIs externas,
 * protegendo as chaves de API no servidor.
 * 
 * Exemplo de uso no frontend:
 * ```typescript
 * const result = await callEdgeFunction({
 *   functionName: 'exemplo-api-externa',
 *   body: { action: 'getData', params: { id: 123 } }
 * });
 * ```
 */

// Configuração de CORS. Em produção, configure ALLOWED_ORIGINS com URLs separadas por vírgula.
const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const allowOrigin = allowedOrigins.length === 0 || allowedOrigins.includes(origin)
    ? (origin || '*')
    : 'null';

  return {
    ...baseCorsHeaders,
    'Access-Control-Allow-Origin': allowOrigin,
  };
}

interface RequestPayload {
  action: string;
  params?: Record<string, any>;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface SupabaseAuthUser {
  id: string;
  email?: string;
}

/**
 * Valida o token de autenticação do usuário
 */
async function validateAuth(authHeader: string | null): Promise<SupabaseAuthUser> {
  if (!authHeader) {
    throw new Error('Token de autenticação não fornecido');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração de autenticação ausente no servidor');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    throw new Error('Token de autenticação inválido ou expirado');
  }

  return await response.json() as SupabaseAuthUser;
}

/**
 * Processa diferentes ações da API
 */
async function processAction(action: string, params: Record<string, any> = {}): Promise<any> {
  // Pegar a chave de API do ambiente (configurada nos secrets do Supabase)
  const apiKey = Deno.env.get('EXTERNAL_API_KEY');

  if (!apiKey) {
    throw new Error('Chave de API não configurada no servidor');
  }

  // Exemplo: diferentes endpoints baseados na action
  switch (action) {
    case 'getData':
      return await fetchExternalData(apiKey, params);

    case 'postData':
      return await postExternalData(apiKey, params);

    case 'updateData':
      return await updateExternalData(apiKey, params);

    default:
      throw new Error(`Ação não suportada: ${action}`);
  }
}

/**
 * Exemplo: Buscar dados de uma API externa
 */
async function fetchExternalData(apiKey: string, params: Record<string, any>): Promise<any> {
  const response = await fetch(`https://api-externa.com/endpoint?id=${params.id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro na API externa: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Exemplo: Enviar dados para uma API externa
 */
async function postExternalData(apiKey: string, params: Record<string, any>): Promise<any> {
  const response = await fetch('https://api-externa.com/endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Erro na API externa: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Exemplo: Atualizar dados em uma API externa
 */
async function updateExternalData(apiKey: string, params: Record<string, any>): Promise<any> {
  const response = await fetch(`https://api-externa.com/endpoint/${params.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.data),
  });

  if (!response.ok) {
    throw new Error(`Erro na API externa: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Log estruturado para monitoramento
 */
function logRequest(level: 'info' | 'error' | 'warn', message: string, meta?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }));
}

/**
 * Handler principal da Edge Function
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const startTime = Date.now();

  try {
    // 1. Validar método HTTP
    if (req.method !== 'POST') {
      throw new Error('Método não permitido. Use POST.');
    }

    // 2. Validar autenticação
    const authHeader = req.headers.get('Authorization');
    await validateAuth(authHeader);

    // 3. Parse do body
    const payload: RequestPayload = await req.json();

    if (!payload.action) {
      throw new Error('Campo "action" é obrigatório');
    }

    logRequest('info', 'Requisição recebida', {
      action: payload.action,
      hasParams: !!payload.params,
    });

    // 4. Processar ação
    const result = await processAction(payload.action, payload.params);

    // 5. Log de sucesso
    const duration = Date.now() - startTime;
    logRequest('info', 'Requisição processada com sucesso', {
      action: payload.action,
      duration: `${duration}ms`,
    });

    // 6. Retornar resposta
    const response: ApiResponse = {
      success: true,
      data: result,
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );

  } catch (error) {
    // Log de erro
    const duration = Date.now() - startTime;
    logRequest('error', 'Erro ao processar requisição', {
      error: error.message,
      duration: `${duration}ms`,
    });

    // Retornar erro
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erro desconhecido',
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json',
        },
        status: error.message.includes('autenticação') ? 401 : 400,
      }
    );
  }
});
