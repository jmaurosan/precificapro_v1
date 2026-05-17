-- =====================================================
-- PRECIFICAPRO - Script ÚNICO e Idempotente
-- SaaS Multi-tenant com RLS + Triggers + Índices
-- =====================================================
-- Pode ser executado várias vezes sem erro.
-- Cole TUDO no SQL Editor do Supabase e clique Run:
-- https://app.supabase.com/project/jgrboitrmckcdzdfzfkf/sql
-- =====================================================

-- 0. Extensão
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FUNÇÕES AUXILIARES (CREATE OR REPLACE = idempotente)
-- =====================================================

-- Auto-criar profile ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Auto-set user_id em INSERTs
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- =====================================================
-- 1. PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
  company_name TEXT DEFAULT 'Individual',
  cnpj TEXT,
  phone TEXT,
  website TEXT,
  avatar_url TEXT,
  address JSONB DEFAULT '{}',
  pricing_config JSONB DEFAULT '{"fixedCosts":0,"monthlyRevenue":0,"monthlyHoursCapacity":160,"taxRate":6,"variableRate":0,"serviceMargin":40,"materialMargin":15}',
  notifications JSONB DEFAULT '{"email":true,"proposals":true,"updates":false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. CLIENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'PF' CHECK (tipo IN ('PF', 'PJ')),
  nome TEXT NOT NULL,
  fantasia TEXT,
  inscricao_estadual TEXT,
  nascimento DATE,
  cpf_cnpj TEXT NOT NULL,
  email TEXT,
  telefones JSONB DEFAULT '{"celular":"","whatsapp":""}',
  endereco_correspondencia JSONB,
  imovel JSONB DEFAULT '{"tipo":"apartamento","endereco":{"logradouro":"","numero":"","bairro":"","cidade":"","uf":"","cep":""},"metragemM2":0,"situacaoPosse":"proprietario","condominio":{"nome":""}}',
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_briefing','proposta_enviada','contratado','perdido')),
  briefing JSONB DEFAULT '{"objetivo":"","estilo":"","prazo":""}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS clients_set_user_id ON public.clients;
CREATE TRIGGER clients_set_user_id
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;
CREATE POLICY "Users can manage own clients"
  ON public.clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. DOCUMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('alvaras_licencas','contratos','art_rrt','projetos_executivos','laudos_tecnicos','certificados_garantia')),
  nome TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  tipo_arquivo TEXT,
  tamanho_bytes BIGINT DEFAULT 0,
  data_upload TIMESTAMPTZ DEFAULT NOW(),
  data_validade DATE,
  status_validade TEXT DEFAULT 'valido' CHECK (status_validade IN ('valido','proximo_vencimento','vencido')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS documents_set_user_id ON public.documents;
CREATE TRIGGER documents_set_user_id
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;
CREATE POLICY "Users can manage own documents"
  ON public.documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. PROJECTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  total_budget NUMERIC(12,2) DEFAULT 0,
  spent_amount NUMERIC(12,2) DEFAULT 0,
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','on_hold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS projects_set_user_id ON public.projects;
CREATE TRIGGER projects_set_user_id
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
CREATE POLICY "Users can manage own projects"
  ON public.projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. PROJECT_EXPENSES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  location TEXT DEFAULT '',
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_value NUMERIC(12,2) DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense','return')),
  receipt_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS project_expenses_set_user_id ON public.project_expenses;
CREATE TRIGGER project_expenses_set_user_id
  BEFORE INSERT ON public.project_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own project expenses" ON public.project_expenses;
CREATE POLICY "Users can manage own project expenses"
  ON public.project_expenses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. CUSTOS_PROJETO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.custos_projeto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outro' CHECK (categoria IN ('mao_de_obra','material','equipamento','servico','transporte','outro')),
  quantidade NUMERIC(10,2) DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  custo_unitario NUMERIC(12,2) DEFAULT 0,
  custo_total NUMERIC(12,2) DEFAULT 0,
  prestador_id UUID,
  prestador_nome TEXT,
  data_lancamento DATE DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado','confirmado','pago','cancelado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS custos_projeto_set_user_id ON public.custos_projeto;
CREATE TRIGGER custos_projeto_set_user_id
  BEFORE INSERT ON public.custos_projeto
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.custos_projeto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own custos" ON public.custos_projeto;
CREATE POLICY "Users can manage own custos"
  ON public.custos_projeto FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 7. CONSIGNADOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.consignados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  fornecedor_nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(10,2) DEFAULT 1,
  valor_unitario_estimado NUMERIC(12,2) DEFAULT 0,
  data_entrada DATE DEFAULT CURRENT_DATE,
  data_previsao_devolucao DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','devolvido','comprado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS consignados_set_user_id ON public.consignados;
CREATE TRIGGER consignados_set_user_id
  BEFORE INSERT ON public.consignados
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.consignados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own consignados" ON public.consignados;
CREATE POLICY "Users can manage own consignados"
  ON public.consignados FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 8. PRESTADORES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prestadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_cadastro TEXT NOT NULL DEFAULT 'PF' CHECK (tipo_cadastro IN ('PF','PJ')),
  cpf_cnpj TEXT NOT NULL,
  ramo_atividade TEXT NOT NULL,
  categoria_profissional TEXT NOT NULL DEFAULT 'Autônomo' CHECK (categoria_profissional IN ('Autônomo','Empresa/Equipe','Parceiro Técnico')),
  especialidades JSONB DEFAULT '[]',
  ferramental_proprio BOOLEAN DEFAULT true,
  disponibilidade_viagem BOOLEAN DEFAULT false,
  email TEXT,
  telefone_celular TEXT,
  status_cadastro TEXT NOT NULL DEFAULT 'aprovado' CHECK (status_cadastro IN ('aprovado','em_analise','reprovado')),
  nota_media NUMERIC(3,1) DEFAULT 5.0,
  experiencia_anos INTEGER DEFAULT 0,
  observacoes_internas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS prestadores_updated_at ON public.prestadores;
CREATE TRIGGER prestadores_updated_at
  BEFORE UPDATE ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS prestadores_set_user_id ON public.prestadores;
CREATE TRIGGER prestadores_set_user_id
  BEFORE INSERT ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own prestadores" ON public.prestadores;
CREATE POLICY "Users can manage own prestadores"
  ON public.prestadores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 9. SUPPLIERS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  category TEXT NOT NULL,
  marcas JSONB DEFAULT '[]',
  email TEXT,
  fone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS suppliers_updated_at ON public.suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS suppliers_set_user_id ON public.suppliers;
CREATE TRIGGER suppliers_set_user_id
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own suppliers" ON public.suppliers;
CREATE POLICY "Users can manage own suppliers"
  ON public.suppliers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 10. CONTAS_PAGAR
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prestador_id UUID REFERENCES public.prestadores(id) ON DELETE SET NULL,
  prestador_nome TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT,
  descricao TEXT NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','paga','atrasada')),
  categoria TEXT NOT NULL DEFAULT 'mao_de_obra' CHECK (categoria IN ('mao_de_obra','material','automacao','projeto')),
  parcela_atual INTEGER,
  total_parcelas INTEGER,
  grupo_id UUID,
  tipo_lancamento TEXT DEFAULT 'expense' CHECK (tipo_lancamento IN ('expense','consignado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS contas_pagar_updated_at ON public.contas_pagar;
CREATE TRIGGER contas_pagar_updated_at
  BEFORE UPDATE ON public.contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS contas_pagar_set_user_id ON public.contas_pagar;
CREATE TRIGGER contas_pagar_set_user_id
  BEFORE INSERT ON public.contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own contas_pagar" ON public.contas_pagar;
CREATE POLICY "Users can manage own contas_pagar"
  ON public.contas_pagar FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 11. SERVICES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  base_price NUMERIC(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'hora',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS services_updated_at ON public.services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS services_set_user_id ON public.services;
CREATE TRIGGER services_set_user_id
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own services" ON public.services;
CREATE POLICY "Users can manage own services"
  ON public.services FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 12. PROPOSALS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL,
  proposal_date DATE DEFAULT CURRENT_DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  company_name TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT,
  total NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS proposals_updated_at ON public.proposals;
CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS proposals_set_user_id ON public.proposals;
CREATE TRIGGER proposals_set_user_id
  BEFORE INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own proposals" ON public.proposals;
CREATE POLICY "Users can manage own proposals"
  ON public.proposals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 13. PROPOSAL_ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.proposal_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  unit TEXT DEFAULT 'un',
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'service' CHECK (category IN ('product','service')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own proposal items" ON public.proposal_items;
CREATE POLICY "Users can manage own proposal items"
  ON public.proposal_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.proposals WHERE proposals.id = proposal_items.proposal_id AND proposals.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals WHERE proposals.id = proposal_items.proposal_id AND proposals.user_id = auth.uid()));

-- =====================================================
-- 14. RECIBOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recibos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  prestador_id UUID REFERENCES public.prestadores(id) ON DELETE SET NULL,
  prestador_nome TEXT NOT NULL,
  prestador_cpf_cnpj TEXT NOT NULL,
  prestador_email TEXT,
  prestador_telefone TEXT,
  prestador_endereco TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nome TEXT NOT NULL,
  client_cpf_cnpj TEXT NOT NULL,
  client_endereco TEXT,
  client_email TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT,
  data_emissao TIMESTAMPTZ DEFAULT NOW(),
  data_servico_inicio DATE,
  data_servico_fim DATE,
  descricao_servico TEXT NOT NULL,
  observacoes TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  forma_recebimento TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','assinado','cancelado')),
  assinatura JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS recibos_updated_at ON public.recibos;
CREATE TRIGGER recibos_updated_at
  BEFORE UPDATE ON public.recibos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS recibos_set_user_id ON public.recibos;
CREATE TRIGGER recibos_set_user_id
  BEFORE INSERT ON public.recibos
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own recibos" ON public.recibos;
CREATE POLICY "Users can manage own recibos"
  ON public.recibos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 15. SCHEDULE_EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.schedule_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'on-track' CHECK (status IN ('on-track','delayed','completed')),
  color TEXT DEFAULT 'teal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS schedule_events_set_user_id ON public.schedule_events;
CREATE TRIGGER schedule_events_set_user_id
  BEFORE INSERT ON public.schedule_events
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own schedule events" ON public.schedule_events;
CREATE POLICY "Users can manage own schedule events"
  ON public.schedule_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 16. INSPECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id TEXT,
  template_name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  responsible TEXT,
  status TEXT NOT NULL DEFAULT 'approved_with_notes' CHECK (status IN ('approved','approved_with_notes','rejected')),
  items_checked JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS inspections_set_user_id ON public.inspections;
CREATE TRIGGER inspections_set_user_id
  BEFORE INSERT ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own inspections" ON public.inspections;
CREATE POLICY "Users can manage own inspections"
  ON public.inspections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 17. NON_CONFORMITIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.non_conformities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  responsible TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  rework_cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS non_conformities_set_user_id ON public.non_conformities;
CREATE TRIGGER non_conformities_set_user_id
  BEFORE INSERT ON public.non_conformities
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own non_conformities" ON public.non_conformities;
CREATE POLICY "Users can manage own non_conformities"
  ON public.non_conformities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 18. ORCAMENTO_RESUMO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orcamento_resumo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  valor_estimado_total NUMERIC(12,2) DEFAULT 0,
  area_total_m2 NUMERIC(10,2) DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  padrao TEXT CHECK (padrao IN ('baixo','medio','alto')),
  percentual_total NUMERIC(5,2) DEFAULT 0,
  valor_total_etapas NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS orcamento_resumo_updated_at ON public.orcamento_resumo;
CREATE TRIGGER orcamento_resumo_updated_at
  BEFORE UPDATE ON public.orcamento_resumo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS orcamento_resumo_set_user_id ON public.orcamento_resumo;
CREATE TRIGGER orcamento_resumo_set_user_id
  BEFORE INSERT ON public.orcamento_resumo
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.orcamento_resumo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own orcamento_resumo" ON public.orcamento_resumo;
CREATE POLICY "Users can manage own orcamento_resumo"
  ON public.orcamento_resumo FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 19. ORCAMENTO_ETAPAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orcamento_etapas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  resumo_id UUID NOT NULL REFERENCES public.orcamento_resumo(id) ON DELETE CASCADE,
  nome_etapa TEXT NOT NULL,
  label TEXT NOT NULL,
  percentual_previsto NUMERIC(5,2) DEFAULT 0,
  valor_previsto NUMERIC(12,2) DEFAULT 0,
  faixa_percentual_min NUMERIC(5,2),
  faixa_percentual_max NUMERIC(5,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS orcamento_etapas_updated_at ON public.orcamento_etapas;
CREATE TRIGGER orcamento_etapas_updated_at
  BEFORE UPDATE ON public.orcamento_etapas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS orcamento_etapas_set_user_id ON public.orcamento_etapas;
CREATE TRIGGER orcamento_etapas_set_user_id
  BEFORE INSERT ON public.orcamento_etapas
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.orcamento_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own orcamento_etapas" ON public.orcamento_etapas;
CREATE POLICY "Users can manage own orcamento_etapas"
  ON public.orcamento_etapas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 20. ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_custos_projeto_project_id ON public.custos_projeto(project_id);
CREATE INDEX IF NOT EXISTS idx_consignados_project_id ON public.consignados(project_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_user_id ON public.contas_pagar(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON public.contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON public.proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON public.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_recibos_user_id ON public.recibos(user_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_user_id ON public.prestadores(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_id ON public.schedule_events(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_project_id ON public.inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_non_conformities_project_id ON public.non_conformities(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_resumo_project_id ON public.orcamento_resumo(project_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_etapas_project_id ON public.orcamento_etapas(project_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_etapas_resumo_id ON public.orcamento_etapas(resumo_id);
