# Product Requirements Document (PRD) - PrecificaPro

## 1. Visão Geral do Produto
O **PrecificaPro** é um ecossistema completo de gestão, precificação e controle de obras desenvolvido para arquitetos, engenheiros e prestadores de serviço. O sistema visa centralizar a gestão financeira, comercial e operacional, permitindo controle absoluto sobre orçamentos, cronogramas e relacionamento com clientes.

A versão atual (v4) foca na modernização da arquitetura com **Supabase** e integração de inteligência artificial (**Gemini AI**) para automação e análise.

## 2. Objetivos Principais
- **Centralização:** Unificar gestão de clientes, projetos, propostas e financeiro em uma única plataforma.
- **Precisão Financeira:** Oferecer ferramentas avançadas de precificação com cálculo de markup dinâmico e controle de budget vs. realizado.
- **Produtividade:** Automatizar tarefas repetitivas e geração de propostas comerciais.
- **Segurança e Escalabilidade:** Utilizar arquitetura serverless moderna (Supabase) para garantir segurança de dados e alta disponibilidade.

## 3. Público-Alvo
- Arquitetos e Escritórios de Arquitetura.
- Engenheiros Civis e Empreiteiros.
- Designers de Interiores.
- Prestadores de Serviço na construção civil.

## 4. Arquitetura Técnica
O projeto utiliza uma stack moderna focada em performance e experiência do desenvolvedor (DX).

### Frontend
- **Framework:** React 19 (via Vite 6)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS (Emerald Design System)
- **Roteamento:** React Router Dom
- **Ícones:** Lucide React
- **Gerenciamento de Estado:** React Hooks nativos / Context API

### Backend & Infraestrutura (Serverless)
- **Plataforma:** Supabase
- **Banco de Dados:** PostgreSQL
- **Autenticação:** Supabase Auth (Suporte a Social Login)
- **API/Lógica:** Supabase Edge Functions (Deno/TypeScript)
- **IA:** Google Gemini AI (Integrado via Edge Functions)

## 5. Funcionalidades Detalhadas

### 5.1 Painel Principal (Dashboard)
- Visão panorâmica do negócio.
- Indicadores de receitas estimadas vs. realizadas.
- Status de propostas (Rascunho, Enviada, Aprovada).
- Resumo de atividades recentes.

### 5.2 Gestão de Obras e Projetos (`/pages/Projects`)
- Listagem e cadastro de projetos.
- Acompanhamento visual de status.
- Controle de **Budget vs. Spent** (Previsto vs. Realizado).
- Timeline e cronograma macro.
- Integração com despesas do projeto.

### 5.3 Calculadora de Preços (`/pages/Calculator`)
- **Nova Calculadora:** Ferramenta robusta para precificação de serviços.
- Cálculo de Markup dinâmico.
- Composição de custos unitários (mão de obra, materiais, impostos).
- Simulação de margem de lucro.

### 5.4 Gestão Financeira (`/pages/Financial`, `/pages/ProjectFinances`)
- Controle de Contas a Pagar e Receber.
- Associação de despesas a centros de custo (projetos).
- Upload e gestão de comprovantes/recibos (`/pages/Receipts`).
- Fluxo de caixa projetado.

### 5.5 CRM e Propostas (`/pages/Clients`, `/pages/Proposals`)
- Cadastro completo de clientes (CRM).
- Histórico de interações.
- Gerador de Propostas Comerciais personalizadas.
- Workflow Comercial: Leads -> Oportunidade -> Fechamento.

### 5.6 Gestão de Fornecedores (`/pages/Providers`)
- Homologação de prestadores de serviço e fornecedores.
- Avaliação e categorização por especialidade.

### 5.7 Inteligência Artificial (Gemini AI)
- Análise de dados automatizada.
- Suporte à geração de descritivos técnicos.
- (Futuro) Leitura automática de notas fiscais e recibos via OCR/IA.

## 6. Requisitos Não-Funcionais
- **Performance:** Carregamento inicial < 2s (Lighthouse Score > 90).
- **Segurança:** Todas as chaves de API sensíveis devem estar em variáveis de ambiente no Supabase (Secrets), nunca expostas no frontend.
- **Responsividade:** Interface 100% responsiva para acesso em tablets e mobile (uso em obra).
- **UX/UI:** Design System consistente (Emerald), com suporte nativo a Dark Mode.

## 7. Roteiro e Próximos Passos (Roadmap)
- [x] Migração para Supabase (Auth/DB).
- [x] Implementação de Edge Functions básicas.
- [ ] **Implantação de Nota Fiscal (NF):** Módulo para emissão e gestão de NFs.
- [ ] **Integração Total Gemini:** Finalizar migração de todas as chamadas AI para o backend.
- [ ] **Refinamento da Calculadora:** Testes de usabilidade e novos cenários de cálculo.
