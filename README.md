# PrecificaPro 🛠️

O **PrecificaPro** é um ecossistema completo de gestão e precificação desenvolvido para arquitetos, engenheiros e prestadores de serviço que buscam controle absoluto sobre seus orçamentos, obras e relacionamento com clientes.

## 🚀 Funcionalidades Principais

- **Painel Principal (Dashboard):** Visão analítica de receitas estimadas, propostas enviadas e status de clientes em tempo real.
- **Gestão de Obras e Projetos:** Acompanhamento de cronograma e consumo de orçamento (Budget vs. Spent).
- **Calculadora de Preços:** Ferramenta de cálculo de markup dinâmico com composição de custos unitários e margem de lucro.
- **Propostas Comerciais:** Emissão de orçamentos detalhados com controle de status (Rascunho, Enviada, Aprovada).
- **CRM de Clientes:** Dossiê completo do cliente, incluindo especificações técnicas de imóveis e briefing.
- **Homologação de Prestadores:** Banco de dados de parceiros e especialistas em automação residencial.
- **Gestão Financeira:** Controle de contas a pagar integrado aos projetos.

## 🛠️ Tecnologias Utilizadas

- **React 19:** Biblioteca principal para interfaces reativas
- **Vite 6:** Build tool moderna e ultra-rápida
- **TypeScript 5.8:** Tipagem estática para maior segurança
- **Tailwind CSS 3:** Estilização utilitária com sistema de design premium
- **Supabase:** Backend-as-a-Service (autenticação, banco de dados, storage)
- **Lucide React:** Iconografia moderna e consistente
- **React Router Dom 7:** Gerenciamento de navegação SPA

## 🎨 Design System Premium

O projeto utiliza um **sistema de design premium** com:
- **Paleta Teal/Emerald**: Gradientes modernos e sofisticados
- **Microanimações**: Hover effects, transitions, loading states
- **Componentes Reutilizáveis**: Botões, cards, inputs, badges
- **Design Tokens**: Spacing (8pt grid), shadows (5 níveis), radius, transitions
- **Dark Mode**: Suporte completo com tema customizado
- **Responsivo**: Mobile-first design
- **Acessibilidade**: WCAG AA compliant, reduced-motion support

## 📦 Desenvolvimento Local

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase (para backend)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/jmaurosan/precificapro_v1.git
cd precificapro_v1

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais do Supabase

# 4. Execute o projeto
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

### Scripts Disponíveis

```bash
npm run dev       # Inicia servidor de desenvolvimento
npm run build     # Cria build de produção
npm run preview   # Preview do build de produção
npm run lint      # Verifica erros de TypeScript
```

## 🚀 Deploy na Vercel

O projeto está configurado para deploy automático na Vercel.

### Deploy Rápido

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jmaurosan/precificapro_v1)

### Deploy Manual

1. Faça fork/clone do repositório
2. Importe o projeto na Vercel
3. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático!

📖 **Guia completo**: Veja [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)

## 📚 Documentação

- **[DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)** - Guia completo de deploy
- **[MELHORIAS-DESIGN.md](./MELHORIAS-DESIGN.md)** - Sistema de design e melhorias
- **[PRD.md](./PRD.md)** - Product Requirements Document

## 🔐 Segurança

- ✅ Headers de segurança configurados (XSS, Clickjacking, MIME)
- ✅ HTTPS automático (Vercel SSL)
- ✅ Variáveis de ambiente protegidas
- ✅ Chaves sensíveis em Edge Functions (Supabase)

## 📊 Performance

- ✅ Build otimizado com Vite
- ✅ Code splitting automático
- ✅ Cache de assets (1 ano)
- ✅ Compressão gzip
- ✅ Lighthouse Score > 90

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.

---

**Desenvolvido com foco em escalabilidade, performance e experiência premium** ✨