import { callEdgeFunction, EdgeFunctionError } from './edgeFunctions';

/**
 * Interface para configuração de geração de conteúdo
 */
interface GenerateContentOptions {
  prompt: string;
  model?: 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
  temperature?: number;
  maxTokens?: number;
}

/**
 * Interface para mensagens de chat
 */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Interface para configuração de chat
 */
interface ChatOptions {
  messages: ChatMessage[];
  model?: 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
  temperature?: number;
  maxTokens?: number;
}

/**
 * Interface para configuração de embeddings
 */
interface EmbedContentOptions {
  text: string;
  model?: 'text-embedding-004';
}

/**
 * Interface para resposta do Gemini
 */
interface GeminiResult {
  text?: string;
  embedding?: number[];
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * API do Google Gemini
 * 
 * Helper para interagir com a API do Google Gemini de forma segura
 * através de Edge Functions do Supabase.
 * 
 * @example
 * ```typescript
 * // Gerar conteúdo
 * const result = await geminiAPI.generateContent({
 *   prompt: "Explique o que é React em 3 parágrafos"
 * });
 * console.log(result.text);
 * 
 * // Chat com contexto
 * const chatResult = await geminiAPI.chat({
 *   messages: [
 *     { role: 'user', content: 'Olá!' },
 *     { role: 'assistant', content: 'Olá! Como posso ajudar?' },
 *     { role: 'user', content: 'Me explique sobre TypeScript' }
 *   ]
 * });
 * 
 * // Gerar embeddings
 * const embedding = await geminiAPI.embedContent({
 *   text: 'Este é um texto para gerar embedding'
 * });
 * ```
 */
export const geminiAPI = {
  /**
   * Gera conteúdo usando o Google Gemini
   * 
   * @param options - Opções de geração
   * @returns Resultado com o texto gerado e metadados
   * 
   * @example
   * ```typescript
   * const result = await geminiAPI.generateContent({
   *   prompt: "Crie uma descrição de produto para uma cadeira de escritório",
   *   temperature: 0.8,
   *   maxTokens: 500
   * });
   * console.log(result.text);
   * console.log(`Tokens usados: ${result.usage.totalTokens}`);
   * ```
   */
  generateContent: async (options: GenerateContentOptions): Promise<GeminiResult> => {
    try {
      const result = await callEdgeFunction<GeminiResult>({
        functionName: 'gemini-api',
        body: {
          action: 'generateContent',
          params: {
            prompt: options.prompt,
            model: options.model || 'gemini-2.0-flash-exp',
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens ?? 2048,
          },
        },
      });

      return result;
    } catch (error) {
      if (error instanceof EdgeFunctionError) {
        throw error;
      }
      throw new EdgeFunctionError(
        `Erro ao gerar conteúdo: ${error.message}`,
        undefined,
        error
      );
    }
  },

  /**
   * Chat com contexto usando o Google Gemini
   * 
   * @param options - Opções de chat
   * @returns Resultado com a resposta do chat e metadados
   * 
   * @example
   * ```typescript
   * const result = await geminiAPI.chat({
   *   messages: [
   *     { role: 'user', content: 'Qual a capital do Brasil?' },
   *     { role: 'assistant', content: 'A capital do Brasil é Brasília.' },
   *     { role: 'user', content: 'E qual é a população?' }
   *   ],
   *   temperature: 0.5
   * });
   * console.log(result.text);
   * ```
   */
  chat: async (options: ChatOptions): Promise<GeminiResult> => {
    try {
      const result = await callEdgeFunction<GeminiResult>({
        functionName: 'gemini-api',
        body: {
          action: 'chat',
          params: {
            messages: options.messages,
            model: options.model || 'gemini-2.0-flash-exp',
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens ?? 2048,
          },
        },
      });

      return result;
    } catch (error) {
      if (error instanceof EdgeFunctionError) {
        throw error;
      }
      throw new EdgeFunctionError(
        `Erro no chat: ${error.message}`,
        undefined,
        error
      );
    }
  },

  /**
   * Gera embeddings de texto usando o Google Gemini
   * 
   * @param options - Opções de embedding
   * @returns Resultado com o vetor de embedding
   * 
   * @example
   * ```typescript
   * const result = await geminiAPI.embedContent({
   *   text: 'Este é um texto para análise semântica'
   * });
   * console.log(result.embedding); // Array de números
   * ```
   */
  embedContent: async (options: EmbedContentOptions): Promise<GeminiResult> => {
    try {
      const result = await callEdgeFunction<GeminiResult>({
        functionName: 'gemini-api',
        body: {
          action: 'embedContent',
          params: {
            text: options.text,
            model: options.model || 'text-embedding-004',
          },
        },
      });

      return result;
    } catch (error) {
      if (error instanceof EdgeFunctionError) {
        throw error;
      }
      throw new EdgeFunctionError(
        `Erro ao gerar embedding: ${error.message}`,
        undefined,
        error
      );
    }
  },

  /**
   * Gera múltiplas respostas em paralelo (útil para comparação)
   * 
   * @param prompts - Array de prompts
   * @param options - Opções compartilhadas
   * @returns Array de resultados
   * 
   * @example
   * ```typescript
   * const results = await geminiAPI.generateMultiple(
   *   [
   *     "Descreva uma casa moderna",
   *     "Descreva uma casa clássica",
   *     "Descreva uma casa minimalista"
   *   ],
   *   { temperature: 0.8 }
   * );
   * results.forEach((result, i) => {
   *   console.log(`Resposta ${i + 1}:`, result.text);
   * });
   * ```
   */
  generateMultiple: async (
    prompts: string[],
    options?: Omit<GenerateContentOptions, 'prompt'>
  ): Promise<GeminiResult[]> => {
    const promises = prompts.map(prompt =>
      geminiAPI.generateContent({ ...options, prompt })
    );
    return Promise.all(promises);
  },

  /**
   * Stream de texto (simulado com chunks)
   * Útil para exibir texto sendo gerado em tempo real
   * 
   * @param options - Opções de geração
   * @param onChunk - Callback chamado para cada chunk de texto
   * @returns Resultado completo
   * 
   * @example
   * ```typescript
   * await geminiAPI.streamContent(
   *   { prompt: "Escreva um artigo sobre IA" },
   *   (chunk) => {
   *     console.log('Novo chunk:', chunk);
   *     // Atualizar UI com o chunk
   *   }
   * );
   * ```
   */
  streamContent: async (
    options: GenerateContentOptions,
    onChunk: (chunk: string) => void
  ): Promise<GeminiResult> => {
    const result = await geminiAPI.generateContent(options);

    // Simular streaming dividindo o texto em palavras
    const words = result.text?.split(' ') || [];
    let currentText = '';

    for (const word of words) {
      currentText += (currentText ? ' ' : '') + word;
      onChunk(currentText);
      // Pequeno delay para simular streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return result;
  },
};

/**
 * Hook React para usar o Gemini API com estados de loading e error
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { generate, loading, error, result } = useGemini();
 * 
 *   const handleGenerate = async () => {
 *     await generate({
 *       prompt: "Explique TypeScript"
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleGenerate} disabled={loading}>
 *         {loading ? 'Gerando...' : 'Gerar'}
 *       </button>
 *       {error && <p>Erro: {error.message}</p>}
 *       {result && <p>{result.text}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGemini() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<EdgeFunctionError | null>(null);
  const [result, setResult] = React.useState<GeminiResult | null>(null);

  const generate = async (options: GenerateContentOptions): Promise<GeminiResult | null> => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await geminiAPI.generateContent(options);
      setResult(res);
      return res;
    } catch (err) {
      const geminiError = err instanceof EdgeFunctionError
        ? err
        : new EdgeFunctionError(err.message);

      setError(geminiError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const chat = async (options: ChatOptions): Promise<GeminiResult | null> => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await geminiAPI.chat(options);
      setResult(res);
      return res;
    } catch (err) {
      const geminiError = err instanceof EdgeFunctionError
        ? err
        : new EdgeFunctionError(err.message);

      setError(geminiError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setResult(null);
  };

  return { generate, chat, loading, error, result, reset };
}

// Importar React apenas se estiver disponível
import React from 'react';
