# ✅ Checklist de Deploy - PrecificaPro

Data: 25/01/2026

---

## 📋 PRÉ-DEPLOY

### Código
- [x] Build compila sem erros (`npm run build`)
- [x] Testes passam (se houver)
- [x] Código commitado no Git
- [x] Push para GitHub concluído

### Configuração
- [x] `vercel.json` criado e configurado
- [x] `.env.example` documentado
- [x] `.gitignore` atualizado (não commita `.env.local`)
- [x] `README.md` atualizado com instruções

### Documentação
- [x] `DEPLOY-VERCEL.md` criado
- [x] `MELHORIAS-DESIGN.md` atualizado
- [x] Variáveis de ambiente documentadas

---

## 🚀 DEPLOY NA VERCEL

### 1. Importar Projeto
- [ ] Acessar https://vercel.com
- [ ] Fazer login com GitHub
- [ ] Clicar em "Add New Project"
- [ ] Selecionar repositório `jmaurosan/precificapro_v1`
- [ ] Clicar em "Import"

### 2. Configurar Variáveis de Ambiente

⚠️ **CRÍTICO**: Configure ANTES de fazer deploy!

- [ ] `VITE_SUPABASE_URL` = `https://yktthhpupvegkwsqhwtv.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = (Cole a chave do `.env.local`)
- [ ] Marcar: Production ✓ Preview ✓ Development ✓

### 3. Deploy
- [ ] Clicar em "Deploy"
- [ ] Aguardar build (~2-3 minutos)
- [ ] Verificar logs (deve terminar com ✓ Success)

---

## ✅ PÓS-DEPLOY

### Testes Funcionais
- [ ] Homepage abre (`/`)
- [ ] Login funciona (`/auth`)
- [ ] Cadastro funciona (`/auth`)
- [ ] Dashboard carrega após login (`/`)
- [ ] Navegação funciona (todas as rotas)
- [ ] Dark mode funciona (toggle tema)
- [ ] Responsivo funciona (mobile/desktop)

### Testes de Integração
- [ ] Supabase conecta (autenticação)
- [ ] Login com Google funciona
- [ ] Login com Apple funciona
- [ ] Dados carregam do banco
- [ ] Formulários salvam no banco

### Performance
- [ ] Lighthouse Score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1

### Segurança
- [ ] HTTPS funcionando (⚠️ Automático na Vercel)
- [ ] Headers de segurança aplicados
- [ ] Variáveis de ambiente não expostas
- [ ] Console sem warnings de segurança

---

## 🔍 TROUBLESHOOTING

### Página em branco?
1. Abrir DevTools (F12) → Console
2. Verificar erros
3. Provável causa: variáveis de ambiente faltando
4. Solução: Vercel → Settings → Environment Variables

### Erro 404 em rotas?
1. Verificar `vercel.json` existe
2. Verificar rewrites configurados
3. Fazer redeploy: Deployments → ⋯ → Redeploy

### Supabase não conecta?
1. Verificar variáveis na Vercel
2. Testar URL: `https://yktthhpupvegkwsqhwtv.supabase.co/rest/v1/`
3. Verificar chave não está expirada
4. Fazer redeploy após corrigir

---

## 📊 MONITORAMENTO

### Analytics (Vercel)
- [ ] Configurar Vercel Analytics
- [ ] Monitorar pageviews
- [ ] Verificar top pages
- [ ] Analisar devices (mobile vs desktop)

### Performance
- [ ] Verificar Core Web Vitals
- [ ] Monitorar bundle size
- [ ] Verificar tempo de carregamento

### Erros
- [ ] Configurar alertas de erro
- [ ] Monitorar logs (`level:error`)
- [ ] Verificar taxa de erro < 1%

---

## 🎉 DEPLOY CONCLUÍDO

### URLs do Projeto
- **Production**: https://precificapro-v1.vercel.app
- **GitHub**: https://github.com/jmaurosan/precificapro_v1
- **Dashboard Vercel**: https://vercel.com/jmaurosan/precificapro-v1

### Próximos Passos
- [ ] (Opcional) Configurar domínio customizado
- [ ] (Opcional) Configurar preview deployments
- [ ] (Opcional) Configurar CI/CD custom
- [ ] Compartilhar com stakeholders
- [ ] Monitorar feedback de usuários

---

## 📝 NOTAS

### Comandos Úteis

```bash
# Verificar status local
git status

# Build local
npm run build

# Preview local do build
npm run preview

# Fazer novo deploy
git push origin main
```

### Contatos de Suporte
- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
- **GitHub**: https://github.com/jmaurosan/precificapro_v1/issues

---

**Status**: ✅ **PRONTO PARA DEPLOY**

*Checklist atualizado em: 25/01/2026 às 15:59*
