# 🚀 Início Rápido: Edge Functions

## ⚡ Setup em 5 Minutos

### 1️⃣ Instalar Supabase CLI
```powershell
npm install -g supabase
```

### 2️⃣ Login e Link ao Projeto
```powershell
# Login
supabase login

# Linkar ao projeto (encontre o project-ref no dashboard)
supabase link --project-ref seu-project-ref-aqui
```

### 3️⃣ Configurar Secrets
```powershell
# Adicionar chave de API
supabase secrets set EXTERNAL_API_KEY=sua-chave-aqui

# Verificar secrets configurados
supabase secrets list
```

### 4️⃣ Deploy da Função
```powershell
# Deploy de uma função específica
supabase functions deploy exemplo-api-externa

# OU deploy de todas as funções
supabase functions deploy
```

### 5️⃣ Testar no Frontend
```typescript
import { externalAPI } from '@/lib/edgeFunctions';

// Usar a função
const data = await externalAPI.getData(123);
console.log(data);
```

---

## 📝 Comandos Úteis

### Ver Logs
```powershell
# Logs em tempo real
supabase functions logs exemplo-api-externa --tail

# Logs com filtro de erro
supabase functions logs exemplo-api-externa --level error
```

### Testar Localmente
```powershell
# Servir função localmente
supabase functions serve exemplo-api-externa

# A função estará em:
# http://localhost:54321/functions/v1/exemplo-api-externa
```

### Testar com cURL
```powershell
# Pegar o anon key do .env ou dashboard
$ANON_KEY = "sua-anon-key"

# Fazer requisição de teste
curl -X POST http://localhost:54321/functions/v1/exemplo-api-externa `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{"action": "getData", "params": {"id": 123}}'
```

---

## 🔧 Troubleshooting Rápido

### Erro: "Function not found"
```powershell
# Verificar funções deployadas
supabase functions list

# Re-deploy
supabase functions deploy exemplo-api-externa
```

### Erro: "Secret not found"
```powershell
# Listar secrets
supabase secrets list

# Adicionar secret faltante
supabase secrets set NOME_SECRET=valor
```

### Erro de CORS
Certifique-se de incluir os headers CORS na Edge Function:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 📂 Estrutura de Arquivos Criada

```
seu-projeto/
├── supabase/
│   └── functions/
│       └── exemplo-api-externa/
│           ├── index.ts          # Código da Edge Function
│           └── deno.json          # Configuração do Deno
├── src/
│   ├── lib/
│   │   └── edgeFunctions.ts      # Helper para chamar Edge Functions
│   └── components/
│       └── ExemploEdgeFunction.tsx # Exemplo de uso
├── scripts/
│   └── deploy-edge-functions.ps1  # Script de deploy
└── .agent/
    └── guia-migracao-api-edge-functions.md # Guia completo
```

---

## 🎯 Próximos Passos

1. **Personalizar a Edge Function**
   - Edite `supabase/functions/exemplo-api-externa/index.ts`
   - Adicione suas próprias actions e lógica

2. **Adicionar Mais Secrets**
   ```powershell
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   ```

3. **Criar Novas Edge Functions**
   ```powershell
   # Criar nova função
   mkdir supabase/functions/nova-funcao
   # Copiar estrutura de exemplo-api-externa
   ```

4. **Implementar Rate Limiting**
   - Veja o guia completo em `.agent/guia-migracao-api-edge-functions.md`

5. **Monitorar em Produção**
   ```powershell
   supabase functions logs exemplo-api-externa --tail
   ```

---

## 💡 Dicas

- **Sempre teste localmente** antes de fazer deploy
- **Use secrets** para todas as chaves sensíveis
- **Implemente logging** para facilitar debug
- **Adicione tratamento de erros** robusto
- **Configure timeout** adequado para suas APIs

---

## 📚 Recursos

- [Documentação Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Guia Completo](./.agent/guia-migracao-api-edge-functions.md)
