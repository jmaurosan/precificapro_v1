import { EdgeFunctionError, externalAPI, useEdgeFunction } from '@/src/lib/edgeFunctions';
import { useState } from 'react';

/**
 * Exemplo de componente usando Edge Functions
 * 
 * Este componente demonstra 3 formas de usar Edge Functions:
 * 1. Chamada direta com try/catch
 * 2. Usando o helper específico (externalAPI)
 * 3. Usando o hook useEdgeFunction
 */
export function ExemploEdgeFunction() {
  const [data, setData] = useState<any>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Hook para gerenciar estado automaticamente
  const { call, loading: hookLoading, error: hookError } = useEdgeFunction();

  /**
   * Exemplo 1: Chamada direta com try/catch
   */
  const handleDirectCall = async () => {
    setManualLoading(true);
    setManualError(null);

    try {
      const result = await externalAPI.getData(123);
      setData(result);
      console.log('Dados recebidos:', result);
    } catch (error) {
      if (error instanceof EdgeFunctionError) {
        setManualError(error.message);

        // Tratar diferentes tipos de erro
        if (error.statusCode === 401) {
          console.error('Usuário não autenticado');
          // Redirecionar para login
        } else if (error.statusCode === 408) {
          console.error('Timeout na requisição');
        } else {
          console.error('Erro na Edge Function:', error.message);
        }
      }
    } finally {
      setManualLoading(false);
    }
  };

  /**
   * Exemplo 2: Usando helper específico
   */
  const handleHelperCall = async () => {
    setManualLoading(true);
    setManualError(null);

    try {
      // Buscar dados
      const result = await externalAPI.getData(123);
      setData(result);

      // Criar novo dado
      // const newData = await externalAPI.postData({ name: 'Teste' });

      // Atualizar dado
      // await externalAPI.updateData(123, { name: 'Atualizado' });

    } catch (error) {
      setManualError(error.message);
    } finally {
      setManualLoading(false);
    }
  };

  /**
   * Exemplo 3: Usando hook useEdgeFunction
   */
  const handleHookCall = async () => {
    const result = await call({
      functionName: 'exemplo-api-externa',
      body: {
        action: 'getData',
        params: { id: 123 },
      },
    });

    if (result) {
      setData(result);
      console.log('Dados recebidos via hook:', result);
    }
  };

  return (
    <div className="exemplo-edge-function">
      <h2>Exemplos de Edge Functions</h2>

      {/* Exemplo 1: Chamada Direta */}
      <section>
        <h3>1. Chamada Direta</h3>
        <button
          onClick={handleDirectCall}
          disabled={manualLoading}
        >
          {manualLoading ? 'Carregando...' : 'Buscar Dados (Direto)'}
        </button>
        {manualError && (
          <p className="error">Erro: {manualError}</p>
        )}
      </section>

      {/* Exemplo 2: Helper Específico */}
      <section>
        <h3>2. Helper Específico</h3>
        <button
          onClick={handleHelperCall}
          disabled={manualLoading}
        >
          {manualLoading ? 'Carregando...' : 'Buscar Dados (Helper)'}
        </button>
      </section>

      {/* Exemplo 3: Hook */}
      <section>
        <h3>3. Hook useEdgeFunction</h3>
        <button
          onClick={handleHookCall}
          disabled={hookLoading}
        >
          {hookLoading ? 'Carregando...' : 'Buscar Dados (Hook)'}
        </button>
        {hookError && (
          <p className="error">Erro: {hookError.message}</p>
        )}
      </section>

      {/* Exibir dados */}
      {data && (
        <section>
          <h3>Dados Recebidos:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </section>
      )}

      <style>{`
        .exemplo-edge-function {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        section {
          margin: 2rem 0;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        h2 {
          color: #333;
          margin-bottom: 2rem;
        }

        h3 {
          color: #666;
          margin-bottom: 1rem;
        }

        button {
          padding: 0.75rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }

        button:hover:not(:disabled) {
          background: #2563eb;
        }

        button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .error {
          color: #ef4444;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fee2e2;
          border-radius: 4px;
        }

        pre {
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}

/**
 * Exemplo de uso em um componente real do projeto
 */
export function ExemploRealUso() {
  const [produtos, setProdutos] = useState([]);
  const { call, loading, error } = useEdgeFunction();

  const buscarProdutos = async () => {
    const result = await call({
      functionName: 'exemplo-api-externa',
      body: {
        action: 'getData',
        params: { tipo: 'produtos' },
      },
    });

    if (result) {
      setProdutos(result);
    }
  };

  const criarProduto = async (produto: any) => {
    const result = await call({
      functionName: 'exemplo-api-externa',
      body: {
        action: 'postData',
        params: produto,
      },
    });

    if (result) {
      // Atualizar lista de produtos
      setProdutos([...produtos, result]);
    }
  };

  return (
    <div>
      <button onClick={buscarProdutos} disabled={loading}>
        {loading ? 'Carregando...' : 'Buscar Produtos'}
      </button>

      {error && <p className="error">{error.message}</p>}

      <ul>
        {produtos.map((produto: any) => (
          <li key={produto.id}>{produto.nome}</li>
        ))}
      </ul>
    </div>
  );
}
