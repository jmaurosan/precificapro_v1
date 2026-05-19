-- =====================================================
-- PRECIFICAPRO - Fundacao SaaS Multiempresa
-- =====================================================
-- Objetivo:
-- - Criar escritorios/empresas (organizations)
-- - Criar membros por escritorio (organization_members)
-- - Preparar RLS por organization_id em vez de apenas user_id
-- - Manter compatibilidade com os dados atuais por usuario
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS private;

-- =====================================================
-- 1. TABELAS BASE DO SAAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  document TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  address JSONB DEFAULT '{}',
  billing_email TEXT,
  plan TEXT NOT NULL DEFAULT 'solo' CHECK (plan IN ('solo','studio','pro','enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','suspended','cancelled')),
  settings JSONB DEFAULT '{}',
  pricing_config JSONB DEFAULT '{"fixedCosts":0,"monthlyRevenue":0,"monthlyHoursCapacity":160,"taxRate":6,"variableRate":0,"serviceMargin":40,"materialMargin":15}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','financial','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','disabled')),
  invited_email TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS organizations_updated_at ON public.organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS organization_members_updated_at ON public.organization_members;
CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 2. FUNCOES PRIVADAS DE AUTORIZACAO
-- =====================================================

CREATE OR REPLACE FUNCTION private.user_is_organization_member(
  organization_id_to_check UUID,
  user_id_to_check UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_id_to_check
      AND om.user_id = user_id_to_check
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.user_has_organization_role(
  organization_id_to_check UUID,
  allowed_roles TEXT[],
  user_id_to_check UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_id_to_check
      AND om.user_id = user_id_to_check
      AND om.status = 'active'
      AND om.role = ANY (allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.current_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT COALESCE(
    (SELECT p.active_organization_id FROM public.profiles p WHERE p.id = auth.uid()),
    (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
      ORDER BY om.created_at ASC
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION private.slugify(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(lower(coalesce(value, 'escritorio')), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION private.ensure_user_default_organization(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_company_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
DECLARE
  existing_organization_id UUID;
  created_organization_id UUID;
  organization_name TEXT;
  organization_slug TEXT;
BEGIN
  SELECT om.organization_id
  INTO existing_organization_id
  FROM public.organization_members om
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
  ORDER BY om.created_at ASC
  LIMIT 1;

  IF existing_organization_id IS NOT NULL THEN
    UPDATE public.profiles
    SET active_organization_id = COALESCE(active_organization_id, existing_organization_id)
    WHERE id = p_user_id;

    RETURN existing_organization_id;
  END IF;

  organization_name := NULLIF(trim(COALESCE(p_company_name, '')), '');
  IF organization_name IS NULL THEN
    organization_name := COALESCE(NULLIF(trim(p_name), ''), split_part(COALESCE(p_email, 'escritorio@precificapro.local'), '@', 1)) || ' - Escritório';
  END IF;

  organization_slug := private.slugify(organization_name);
  IF organization_slug IS NULL OR organization_slug = '' THEN
    organization_slug := 'escritorio';
  END IF;
  organization_slug := organization_slug || '-' || substring(replace(uuid_generate_v4()::TEXT, '-', '') from 1 for 6);

  INSERT INTO public.organizations (
    owner_user_id,
    name,
    slug,
    email,
    billing_email
  )
  VALUES (
    p_user_id,
    organization_name,
    organization_slug,
    p_email,
    p_email
  )
  RETURNING id INTO created_organization_id;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status
  )
  VALUES (
    created_organization_id,
    p_user_id,
    'owner',
    'active'
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.profiles
  SET active_organization_id = created_organization_id,
      company_name = COALESCE(NULLIF(company_name, ''), organization_name)
  WHERE id = p_user_id;

  RETURN created_organization_id;
END;
$$;

-- =====================================================
-- 3. ATUALIZAR CRIACAO AUTOMATICA DO USUARIO
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_name TEXT;
BEGIN
  profile_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    profile_name,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM private.ensure_user_default_organization(
    NEW.id,
    NEW.email,
    profile_name,
    NEW.raw_user_meta_data->>'company_name'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth, private;

-- Criar escritorio padrao para usuarios ja existentes.
SELECT private.ensure_user_default_organization(
  p.id,
  p.email,
  p.name,
  p.company_name
)
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organization_members om
  WHERE om.user_id = p.id
);

-- =====================================================
-- 4. ADICIONAR organization_id NAS TABELAS DE NEGOCIO
-- =====================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.project_expenses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.custos_projeto ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.consignados ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.prestadores ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.recibos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.schedule_events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.non_conformities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.orcamento_resumo ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.orcamento_etapas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill por usuario dono atual.
UPDATE public.clients t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.documents t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.projects t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.project_expenses t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.custos_projeto t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.consignados t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.prestadores t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.suppliers t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.contas_pagar t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.services t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.proposals t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.recibos t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.schedule_events t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.inspections t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.non_conformities t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.orcamento_resumo t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;
UPDATE public.orcamento_etapas t SET organization_id = p.active_organization_id FROM public.profiles p WHERE t.user_id = p.id AND t.organization_id IS NULL;

-- Atualiza a funcao usada pelos triggers existentes.
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;

  IF NEW.organization_id IS NULL THEN
    NEW.organization_id = private.current_organization_id();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
ALTER FUNCTION public.set_user_id() SET search_path = public, auth, private;

-- =====================================================
-- 5. RLS MULTIEMPRESA
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view organizations" ON public.organizations;
CREATE POLICY "Organization members can view organizations"
  ON public.organizations FOR SELECT
  USING (private.user_is_organization_member(id));

DROP POLICY IF EXISTS "Users can create own organization" ON public.organizations;
CREATE POLICY "Users can create own organization"
  ON public.organizations FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Organization admins can update organizations" ON public.organizations;
CREATE POLICY "Organization admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (private.user_has_organization_role(id, ARRAY['owner','admin']))
  WITH CHECK (private.user_has_organization_role(id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS "Organization owners can delete organizations" ON public.organizations;
CREATE POLICY "Organization owners can delete organizations"
  ON public.organizations FOR DELETE
  USING (private.user_has_organization_role(id, ARRAY['owner']));

DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;
CREATE POLICY "Members can view organization members"
  ON public.organization_members FOR SELECT
  USING (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Admins can add organization members" ON public.organization_members;
CREATE POLICY "Admins can add organization members"
  ON public.organization_members FOR INSERT
  WITH CHECK (private.user_has_organization_role(organization_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS "Admins can update organization members" ON public.organization_members;
CREATE POLICY "Admins can update organization members"
  ON public.organization_members FOR UPDATE
  USING (private.user_has_organization_role(organization_id, ARRAY['owner','admin']))
  WITH CHECK (private.user_has_organization_role(organization_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS "Owners can remove organization members" ON public.organization_members;
CREATE POLICY "Owners can remove organization members"
  ON public.organization_members FOR DELETE
  USING (private.user_has_organization_role(organization_id, ARRAY['owner']));

-- Profiles continuam pessoais, mas membros podem ver perfis de colegas do mesmo escritorio.
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR EXISTS (
      SELECT 1
      FROM public.organization_members mine
      JOIN public.organization_members theirs ON theirs.organization_id = mine.organization_id
      WHERE mine.user_id = auth.uid()
        AND mine.status = 'active'
        AND theirs.user_id = profiles.id
        AND theirs.status = 'active'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Recria politicas de negocio por escritorio.
DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;
DROP POLICY IF EXISTS "Organization members can manage clients" ON public.clients;
CREATE POLICY "Organization members can manage clients"
  ON public.clients FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;
DROP POLICY IF EXISTS "Organization members can manage documents" ON public.documents;
CREATE POLICY "Organization members can manage documents"
  ON public.documents FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
DROP POLICY IF EXISTS "Organization members can manage projects" ON public.projects;
CREATE POLICY "Organization members can manage projects"
  ON public.projects FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own project expenses" ON public.project_expenses;
DROP POLICY IF EXISTS "Organization members can manage project expenses" ON public.project_expenses;
CREATE POLICY "Organization members can manage project expenses"
  ON public.project_expenses FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own custos" ON public.custos_projeto;
DROP POLICY IF EXISTS "Organization members can manage custos" ON public.custos_projeto;
CREATE POLICY "Organization members can manage custos"
  ON public.custos_projeto FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own consignados" ON public.consignados;
DROP POLICY IF EXISTS "Organization members can manage consignados" ON public.consignados;
CREATE POLICY "Organization members can manage consignados"
  ON public.consignados FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own prestadores" ON public.prestadores;
DROP POLICY IF EXISTS "Organization members can manage prestadores" ON public.prestadores;
CREATE POLICY "Organization members can manage prestadores"
  ON public.prestadores FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Organization members can manage suppliers" ON public.suppliers;
CREATE POLICY "Organization members can manage suppliers"
  ON public.suppliers FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Organization members can manage contas_pagar" ON public.contas_pagar;
CREATE POLICY "Organization members can manage contas_pagar"
  ON public.contas_pagar FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own services" ON public.services;
DROP POLICY IF EXISTS "Organization members can manage services" ON public.services;
CREATE POLICY "Organization members can manage services"
  ON public.services FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Organization members can manage proposals" ON public.proposals;
CREATE POLICY "Organization members can manage proposals"
  ON public.proposals FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own proposal items" ON public.proposal_items;
DROP POLICY IF EXISTS "Organization members can manage proposal items" ON public.proposal_items;
CREATE POLICY "Organization members can manage proposal items"
  ON public.proposal_items FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id
        AND private.user_is_organization_member(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id
        AND private.user_is_organization_member(p.organization_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage own recibos" ON public.recibos;
DROP POLICY IF EXISTS "Organization members can manage recibos" ON public.recibos;
CREATE POLICY "Organization members can manage recibos"
  ON public.recibos FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own schedule events" ON public.schedule_events;
DROP POLICY IF EXISTS "Organization members can manage schedule events" ON public.schedule_events;
CREATE POLICY "Organization members can manage schedule events"
  ON public.schedule_events FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Organization members can manage inspections" ON public.inspections;
CREATE POLICY "Organization members can manage inspections"
  ON public.inspections FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own non_conformities" ON public.non_conformities;
DROP POLICY IF EXISTS "Organization members can manage non_conformities" ON public.non_conformities;
CREATE POLICY "Organization members can manage non_conformities"
  ON public.non_conformities FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own orcamento_resumo" ON public.orcamento_resumo;
DROP POLICY IF EXISTS "Organization members can manage orcamento_resumo" ON public.orcamento_resumo;
CREATE POLICY "Organization members can manage orcamento_resumo"
  ON public.orcamento_resumo FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

DROP POLICY IF EXISTS "Users can manage own orcamento_etapas" ON public.orcamento_etapas;
DROP POLICY IF EXISTS "Organization members can manage orcamento_etapas" ON public.orcamento_etapas;
CREATE POLICY "Organization members can manage orcamento_etapas"
  ON public.orcamento_etapas FOR ALL
  USING (private.user_is_organization_member(organization_id))
  WITH CHECK (private.user_is_organization_member(organization_id));

-- =====================================================
-- 6. INDICES E GRANTS PARA DATA API
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_organizations_owner_user_id ON public.organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active_organization_id ON public.profiles(active_organization_id);

CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_organization_id ON public.project_expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_custos_projeto_organization_id ON public.custos_projeto(organization_id);
CREATE INDEX IF NOT EXISTS idx_consignados_organization_id ON public.consignados(organization_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_organization_id ON public.prestadores(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_organization_id ON public.contas_pagar(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_organization_id ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_organization_id ON public.proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_recibos_organization_id ON public.recibos(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_organization_id ON public.schedule_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspections_organization_id ON public.inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_non_conformities_organization_id ON public.non_conformities(organization_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_resumo_organization_id ON public.orcamento_resumo(organization_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_etapas_organization_id ON public.orcamento_etapas(organization_id);

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
