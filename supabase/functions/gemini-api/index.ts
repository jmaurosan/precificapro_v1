import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: gemini-api
 * 
 * Proxy seguro para a API do Google Gemini
 * Protege a chave de API no servidor e adiciona controles de segurança
 * 
 * Exemplo de uso no frontend:
 * ```typescript
 * const result = await geminiAPI.generateContent({
 *   prompt: "Explique o que é React",
 *   model: "gemini-pro"
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

interface GeminiRequest {
  action: 'generateContent' | 'chat' | 'embedContent';
  params: {
    prompt?: string;
    messages?: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    text?: string;
  };
}

interface GeminiResponse {
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
 * Gera conteúdo usando o Gemini
 */
async function generateContent(apiKey: string, params: any): Promise<any> {
  const {
    prompt,
    model = 'gemini-2.0-flash-exp',
    temperature = 0.7,
    maxTokens = 2048,
  } = params;

  if (!prompt) {
    throw new Error('Prompt é obrigatório');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro na API do Gemini: ${error}`);
  }

  const result = await response.json();

  // Extrair o texto da resposta
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    text,
    model,
    usage: {
      promptTokens: result.usageMetadata?.promptTokenCount || 0,
      completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: result.usageMetadata?.totalTokenCount || 0,
    },
  };
}

/**
 * Chat com contexto usando o Gemini
 */
async function chat(apiKey: string, params: any): Promise<any> {
  const {
    messages,
    model = 'gemini-2.0-flash-exp',
    temperature = 0.7,
    maxTokens = 2048,
  } = params;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages é obrigatório e deve ser um array não vazio');
  }

  // Converter mensagens para o formato do Gemini
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro na API do Gemini: ${error}`);
  }

  const result = await response.json();

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    text,
    model,
    usage: {
      promptTokens: result.usageMetadata?.promptTokenCount || 0,
      completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: result.usageMetadata?.totalTokenCount || 0,
    },
  };
}

/**
 * Gera embeddings usando o Gemini
 */
async function embedContent(apiKey: string, params: any): Promise<any> {
  const { text, model = 'text-embedding-004' } = params;

  if (!text) {
    throw new Error('Text é obrigatório');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }]
        }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro na API do Gemini: ${error}`);
  }

  const result = await response.json();

  return {
    embedding: result.embedding?.values || [],
    model,
  };
}

/**
 * Processa diferentes ações da API do Gemini
 */
async function processAction(action: string, params: any): Promise<any> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('Chave de API do Gemini não configurada no servidor');
  }

  switch (action) {
    case 'generateContent':
      return await generateContent(apiKey, params);

    case 'chat':
      return await chat(apiKey, params);

    case 'embedContent':
      return await embedContent(apiKey, params);

    default:
      throw new Error(`Ação não suportada: ${action}`);
  }
}

/**
 * Log estruturado para monitoramento
 */
function log(level: 'info' | 'error' | 'warn', message: string, meta?: any) {
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
    const payload: GeminiRequest = await req.json();

    if (!payload.action) {
      throw new Error('Campo "action" é obrigatório');
    }

    if (!payload.params) {
      throw new Error('Campo "params" é obrigatório');
    }

    log('info', 'Requisição Gemini recebida', {
      action: payload.action,
      model: payload.params.model,
    });

    // 4. Processar ação
    const result = await processAction(payload.action, payload.params);

    // 5. Log de sucesso
    const duration = Date.now() - startTime;
    log('info', 'Requisição Gemini processada com sucesso', {
      action: payload.action,
      duration: `${duration}ms`,
      tokensUsed: result.usage?.totalTokens || 0,
    });

    // 6. Retornar resposta
    const response: GeminiResponse = {
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
    log('error', 'Erro ao processar requisição Gemini', {
      error: error.message,
      duration: `${duration}ms`,
    });

    // Retornar erro
    const response: GeminiResponse = {
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
