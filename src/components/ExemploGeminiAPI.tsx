import { EdgeFunctionError } from '@/src/lib/edgeFunctions';
import { geminiAPI, useGemini } from '@/src/lib/geminiAPI';
import { useState } from 'react';

/**
 * Componente de exemplo mostrando diferentes formas de usar a API do Gemini
 */
export function ExemploGeminiAPI() {
  const [prompt, setPrompt] = useState('');
  const [manualResult, setManualResult] = useState<string>('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string>('');

  // Hook para gerenciar estado automaticamente
  const { generate, loading: hookLoading, error: hookError, result: hookResult } = useGemini();

  /**
   * Exemplo 1: Chamada direta com try/catch
   */
  const handleDirectCall = async () => {
    if (!prompt.trim()) {
      setManualError('Digite um prompt');
      return;
    }

    setManualLoading(true);
    setManualError('');
    setManualResult('');

    try {
      const result = await geminiAPI.generateContent({
        prompt,
        temperature: 0.7,
        maxTokens: 1000,
      });

      setManualResult(result.text || '');
      console.log('Tokens usados:', result.usage?.totalTokens);
    } catch (error) {
      if (error instanceof EdgeFunctionError) {
        setManualError(error.message);

        // Tratar diferentes tipos de erro
        if (error.statusCode === 401) {
          console.error('Usuário não autenticado - redirecionar para login');
        } else if (error.statusCode === 408) {
          console.error('Timeout na requisição');
        }
      } else {
        setManualError('Erro desconhecido');
      }
    } finally {
      setManualLoading(false);
    }
  };

  /**
   * Exemplo 2: Usando hook useGemini
   */
  const handleHookCall = async () => {
    if (!prompt.trim()) return;

    await generate({
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    });
  };

  /**
   * Exemplo 3: Chat com contexto
   */
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleChat = async () => {
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { role: 'user' as const, content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const result = await geminiAPI.chat({
        messages: newMessages,
        temperature: 0.7,
      });

      setChatMessages([
        ...newMessages,
        { role: 'assistant' as const, content: result.text || '' }
      ]);
    } catch (error) {
      console.error('Erro no chat:', error);
    } finally {
      setChatLoading(false);
    }
  };

  /**
   * Exemplo 4: Streaming (simulado)
   */
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);

  const handleStream = async () => {
    if (!prompt.trim()) return;

    setStreaming(true);
    setStreamText('');

    try {
      await geminiAPI.streamContent(
        { prompt },
        (chunk) => {
          setStreamText(chunk);
        }
      );
    } catch (error) {
      console.error('Erro no streaming:', error);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="exemplo-gemini">
      <h1>Exemplos de Uso - Google Gemini API</h1>

      {/* Input compartilhado */}
      <div className="input-section">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Digite seu prompt aqui..."
          rows={4}
        />
      </div>

      {/* Exemplo 1: Chamada Direta */}
      <section className="example-section">
        <h2>1. Chamada Direta (com try/catch)</h2>
        <button
          onClick={handleDirectCall}
          disabled={manualLoading}
          className="btn-primary"
        >
          {manualLoading ? 'Gerando...' : 'Gerar Conteúdo'}
        </button>

        {manualError && (
          <div className="error-box">
            <strong>Erro:</strong> {manualError}
          </div>
        )}

        {manualResult && (
          <div className="result-box">
            <strong>Resultado:</strong>
            <p>{manualResult}</p>
          </div>
        )}
      </section>

      {/* Exemplo 2: Hook */}
      <section className="example-section">
        <h2>2. Usando Hook useGemini</h2>
        <button
          onClick={handleHookCall}
          disabled={hookLoading}
          className="btn-primary"
        >
          {hookLoading ? 'Gerando...' : 'Gerar com Hook'}
        </button>

        {hookError && (
          <div className="error-box">
            <strong>Erro:</strong> {hookError.message}
          </div>
        )}

        {hookResult && (
          <div className="result-box">
            <strong>Resultado:</strong>
            <p>{hookResult.text}</p>
            <small>Tokens: {hookResult.usage?.totalTokens}</small>
          </div>
        )}
      </section>

      {/* Exemplo 3: Chat */}
      <section className="example-section">
        <h2>3. Chat com Contexto</h2>

        <div className="chat-container">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <strong>{msg.role === 'user' ? 'Você' : 'Gemini'}:</strong>
              <p>{msg.content}</p>
            </div>
          ))}

          {chatLoading && (
            <div className="chat-message assistant">
              <strong>Gemini:</strong>
              <p className="loading">Pensando...</p>
            </div>
          )}
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleChat()}
            placeholder="Digite sua mensagem..."
            disabled={chatLoading}
          />
          <button
            onClick={handleChat}
            disabled={chatLoading || !chatInput.trim()}
            className="btn-primary"
          >
            Enviar
          </button>
        </div>
      </section>

      {/* Exemplo 4: Streaming */}
      <section className="example-section">
        <h2>4. Streaming (Simulado)</h2>
        <button
          onClick={handleStream}
          disabled={streaming}
          className="btn-primary"
        >
          {streaming ? 'Gerando...' : 'Gerar com Streaming'}
        </button>

        {streamText && (
          <div className="result-box streaming">
            <strong>Resultado (streaming):</strong>
            <p>{streamText}</p>
          </div>
        )}
      </section>

      <style>{`
        .exemplo-gemini {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        h1 {
          color: #1a1a1a;
          margin-bottom: 2rem;
          font-size: 2rem;
        }

        h2 {
          color: #333;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .input-section {
          margin-bottom: 2rem;
        }

        textarea {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        textarea:focus {
          outline: none;
          border-color: #4285f4;
        }

        .example-section {
          margin: 2rem 0;
          padding: 1.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          background: #fafafa;
        }

        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: #4285f4;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #3367d6;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(66, 133, 244, 0.3);
        }

        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .error-box {
          margin-top: 1rem;
          padding: 1rem;
          background: #fee2e2;
          border-left: 4px solid #ef4444;
          border-radius: 6px;
          color: #991b1b;
        }

        .result-box {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-left: 4px solid #10b981;
          border-radius: 6px;
        }

        .result-box p {
          margin: 0.5rem 0;
          line-height: 1.6;
          color: #333;
        }

        .result-box small {
          color: #666;
          font-size: 0.875rem;
        }

        .result-box.streaming {
          border-left-color: #f59e0b;
        }

        .chat-container {
          max-height: 400px;
          overflow-y: auto;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .chat-message {
          margin: 1rem 0;
          padding: 0.75rem;
          border-radius: 8px;
        }

        .chat-message.user {
          background: #e3f2fd;
          margin-left: 2rem;
        }

        .chat-message.assistant {
          background: #f3f4f6;
          margin-right: 2rem;
        }

        .chat-message strong {
          display: block;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }

        .chat-message p {
          margin: 0;
          line-height: 1.6;
          color: #333;
        }

        .chat-message .loading {
          font-style: italic;
          color: #666;
        }

        .chat-input {
          display: flex;
          gap: 0.5rem;
        }

        .chat-input input {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 1rem;
        }

        .chat-input input:focus {
          outline: none;
          border-color: #4285f4;
        }
      `}</style>
    </div>
  );
}

/**
 * Exemplo de uso real no projeto - Gerador de Descrições de Produtos
 */
export function GeradorDescricaoProduto() {
  const { generate, loading, error, result } = useGemini();
  const [nomeProduto, setNomeProduto] = useState('');
  const [categoria, setCategoria] = useState('');

  const handleGerar = async () => {
    const prompt = `Crie uma descrição profissional e atraente para o seguinte produto:
    
Produto: ${nomeProduto}
Categoria: ${categoria}

A descrição deve ter:
- 2-3 parágrafos
- Destacar benefícios
- Ser persuasiva
- Tom profissional`;

    await generate({ prompt, temperature: 0.8 });
  };

  return (
    <div className="gerador-descricao">
      <h2>Gerador de Descrições de Produtos</h2>

      <div className="form-group">
        <label>Nome do Produto:</label>
        <input
          type="text"
          value={nomeProduto}
          onChange={(e) => setNomeProduto(e.target.value)}
          placeholder="Ex: Cadeira de Escritório Ergonômica"
        />
      </div>

      <div className="form-group">
        <label>Categoria:</label>
        <input
          type="text"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Ex: Móveis para Escritório"
        />
      </div>

      <button
        onClick={handleGerar}
        disabled={loading || !nomeProduto || !categoria}
        className="btn-primary"
      >
        {loading ? 'Gerando...' : 'Gerar Descrição'}
      </button>

      {error && <div className="error-box">Erro: {error.message}</div>}

      {result && (
        <div className="result-box">
          <h3>Descrição Gerada:</h3>
          <p>{result.text}</p>
        </div>
      )}
    </div>
  );
}
