import React from 'react';
import { supabase } from './supabaseClient';

/**
 * Interface para opções de chamada de Edge Functions
 */
interface EdgeFunctionOptions {
  functionName: string;
  body?: any;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  timeout?: number;
}

/**
 * Interface para resposta padrão das Edge Functions
 */
interface EdgeFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Classe de erro customizada
 */
export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

/**
 * Helper principal corrigido para usar a nova chave do Gemini
 */
export async function callEdgeFunction<T = any>({
  functionName,
  body,
  method = 'POST',
  timeout = 30000,
}: EdgeFunctionOptions): Promise<T> {
  try {
    // 1. Edge Functions sensíveis exigem usuário autenticado.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new EdgeFunctionError('Faça login para usar este recurso.', 401);
    }

    // 2. Preparar URL da Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // 3. Fazer requisição usando o token correto
      const response = await fetch(functionUrl, {
        method,
        headers: {
          // CORREÇÃO: Agora usa a variável 'token' definida acima
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result: EdgeFunctionResponse<T> = await response.json();

      if (!response.ok || !result.success) {
        throw new EdgeFunctionError(
          result.error || `Erro HTTP ${response.status}`,
          response.status,
          result
        );
      }

      return result.data as T;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new EdgeFunctionError(`Timeout excedeu ${timeout}ms`, 408);
      }
      throw error;
    }

  } catch (error) {
    console.error(`[EdgeFunction] Erro ao chamar ${functionName}:`, error);
    if (error instanceof EdgeFunctionError) throw error;
    throw new EdgeFunctionError(error.message || 'Erro de conexão', undefined, error);
  }
}


/**
 * Exemplo de API externa (Helper)
 */
export const externalAPI = {
  getData: (id: number) => callEdgeFunction({
    functionName: 'exemplo-api-externa',
    body: { action: 'getData', params: { id } }
  }),
  postData: (data: any) => callEdgeFunction({
    functionName: 'exemplo-api-externa',
    body: { action: 'postData', params: data }
  }),
  updateData: (id: number, data: any) => callEdgeFunction({
    functionName: 'exemplo-api-externa',
    body: { action: 'updateData', params: { id, ...data } }
  }),
};

/**
 * Hook React para usar Edge Functions
 */
export function useEdgeFunction() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<EdgeFunctionError | null>(null);

  const call = async <T = any>(options: EdgeFunctionOptions): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      return await callEdgeFunction<T>(options);
    } catch (err) {
      setError(err instanceof EdgeFunctionError ? err : new EdgeFunctionError(err.message));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { call, loading, error };
}
