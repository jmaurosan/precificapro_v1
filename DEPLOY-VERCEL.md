# 🚀 Guia de Deploy na Vercel - PrecificaPro

## 📋 Pré-requisitos

Antes de fazer o deploy, certifique-se de que:

- ✅ Código commitado no Git (`git status` limpo)
- ✅ Repositório no GitHub atualizado
- ✅ Build local funciona (`npm run build`)
- ✅ Variáveis de ambiente documentadas em `.env.example`

---

## 🎯 Passo a Passo - Deploy Automático via GitHub

### 1️⃣ **Criar Conta na Vercel**

1. Acesse: https://vercel.com/signup
2. Faça login com sua conta GitHub
3. Autorize a Vercel a acessar seus repositórios

### 2️⃣ **Importar Projeto**

1. No dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Selecione o repositório: `jmaurosan/precificapro_v1`
3. Clique em **"Import"**

### 3️⃣ **Configurar Build**

A Vercel detectará automaticamente as configurações do `vercel.json`:

```json
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

✅ **Não precisa alterar nada!** A configuração já está no `vercel.json`.

### 4️⃣ **Adicionar Variáveis de Ambiente**

⚠️ **IMPORTANTE**: Configure as variáveis de ambiente antes de fazer o deploy!

1. Na tela de configuração do projeto, procure **"Environment Variables"**
2. Adicione as seguintes variáveis:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_SUPABASE_URL` | `https://jgrboitrmckcdzdfzfkf.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Cole a anon public key do Supabase Dashboard | Production, Preview, Development |

**Onde encontrar os valores:**
- Abra seu arquivo `.env.local` local
- Copie os valores de cada variável
- Cole na Vercel (certifique-se de selecionar todos os ambientes)

### 5️⃣ **Fazer Deploy**

1. Clique em **"Deploy"**
2. Aguarde o build (~2-3 minutos)
3. ✅ Pronto! Seu projeto estará online

---

## 🔗 URLs do Projeto

Após o deploy, você terá:

- **Production URL**: `https://precificapro-v1.vercel.app` (ou domínio customizado)
- **Preview URLs**: Uma URL única para cada pull request
- **Dashboard**: https://vercel.com/jmaurosan/precificapro-v1

---

## 🔄 Deployments Automáticos

A partir de agora, **cada push no GitHub** dispara um novo deploy automático:

| Branch | Tipo de Deploy | URL |
|--------|----------------|-----|
| `main` | **Production** | URL principal |
| Outros | **Preview** | URL temporária para testes |
| Pull Requests | **Preview** | URL única por PR |

### Como Funciona

```bash
# 1. Faça alterações localmente
git add .
git commit -m "feat: nova funcionalidade"

# 2. Envie para o GitHub
git push origin main

# 3. A Vercel detecta e faz deploy automaticamente! 🚀
```

---

## ⚙️ Configurações Avançadas

### Build & Development Settings

Já configuradas no `vercel.json`:

- ✅ **Framework**: Vite
- ✅ **Build Command**: `npm run build`
- ✅ **Output Directory**: `dist`
- ✅ **Install Command**: `npm install`
- ✅ **Node Version**: 18.x (detectado automaticamente)

### Headers de Segurança

Headers já configurados no `vercel.json`:

```json
✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: DENY
✅ X-XSS-Protection: 1; mode=block
✅ Referrer-Policy: strict-origin-when-cross-origin
```

### Cache de Assets

Assets otimizados para performance:

```
/assets/* → Cache por 1 ano (immutable)
```

### SPA Routing

Configuração para React Router (Hash Router):

```json
Todas as rotas → /index.html (SPA rewrite)
```

---

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique:

### ✅ Checklist de Verificação

- [ ] **Homepage carrega** (`/`)
- [ ] **Login funciona** (`/auth`)
- [ ] **Navegação funciona** (todas as rotas)
- [ ] **Dark mode funciona** (botão de tema)
- [ ] **Formulários funcionam** (cadastro, login)
- [ ] **Supabase conecta** (autenticação, dados)
- [ ] **Performance boa** (Lighthouse > 90)

### 🚨 Problemas Comuns

#### ❌ Página em branco

**Causa**: Variáveis de ambiente faltando  
**Solução**:
1. Vá em: Vercel Dashboard → Projeto → Settings → Environment Variables
2. Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. Faça novo deploy: Deployments → ⋯ → Redeploy

#### ❌ Erro 404 ao navegar

**Causa**: SPA rewrites não configurados  
**Solução**: Já resolvido no `vercel.json` (rewrites configurados)

#### ❌ Supabase não conecta

**Causa**: URL ou chave incorretas  
**Solução**:
1. Verifique as variáveis de ambiente na Vercel
2. Compare com `.env.local` local
3. Faça novo deploy após corrigir

---

## 🎨 Domínio Customizado (Opcional)

### Adicionar Domínio

1. Vá em: Vercel Dashboard → Projeto → Settings → Domains
2. Clique em **"Add"**
3. Digite seu domínio (ex: `precificapro.com`)
4. Configure DNS conforme instruções da Vercel

### Domínios Recomendados

- `precificapro.com.br`
- `app.precificapro.com`
- `precificapro.vercel.app` (gratuito)

---

## 📊 Monitoramento

### Analytics

A Vercel fornece analytics gratuitamente:

- **Pageviews**: Visualizações de página
- **Top Pages**: Páginas mais visitadas
- **Devices**: Desktop vs Mobile
- **Locations**: De onde vêm os acessos

### Logs

Acesse logs em tempo real:

1. Vercel Dashboard → Projeto → Functions → Logs
2. Filtre por erros: `level:error`
3. Busque por texto específico

### Performance

Monitore Web Vitals:

- **LCP**: Largest Contentful Paint
- **FID**: First Input Delay
- **CLS**: Cumulative Layout Shift

---

## 🔐 Segurança

### Headers Configurados

Já incluídos no `vercel.json`:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### HTTPS

✅ **Automático**: A Vercel fornece SSL grátis para todos os domínios

### Environment Variables

⚠️ **NUNCA** commite `.env.local` no Git!

Variáveis sensíveis devem estar APENAS em:
1. `.env.local` (local development)
2. Vercel Environment Variables (production)

---

## 🆘 Suporte

### Documentação Vercel

- **Guia Vite**: https://vercel.com/docs/frameworks/vite
- **Environment Variables**: https://vercel.com/docs/environment-variables
- **Custom Domains**: https://vercel.com/docs/custom-domains

### Suporte Técnico

- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **Documentação Oficial**: https://vercel.com/docs

---

## 🎉 Pronto!

Seu projeto está configurado e pronto para deploy na Vercel!

### Próximos Passos

1. ✅ Configure as variáveis de ambiente
2. ✅ Faça o primeiro deploy
3. ✅ Teste todas as funcionalidades
4. ✅ (Opcional) Configure domínio customizado
5. ✅ Compartilhe com o mundo! 🚀

---

*Última atualização: 25/01/2026*
