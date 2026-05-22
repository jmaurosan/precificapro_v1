-- =====================================================
-- PRECIFICAPRO - Diario de Obra / Relatorios de Andamento
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.project_daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT DEFAULT 'nao_informado' CHECK (weather IN ('nao_informado','sol','nublado','chuva','interrompido')),
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluido','parcial','bloqueado')),
  workforce TEXT,
  activities TEXT NOT NULL,
  blockers TEXT,
  next_steps TEXT,
  photos JSONB DEFAULT '[]',
  shared_with_client BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_daily_reports_project_date
  ON public.project_daily_reports(project_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_project_daily_reports_user_id
  ON public.project_daily_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_project_daily_reports_organization_id
  ON public.project_daily_reports(organization_id);

DROP TRIGGER IF EXISTS project_daily_reports_updated_at ON public.project_daily_reports;
CREATE TRIGGER project_daily_reports_updated_at
  BEFORE UPDATE ON public.project_daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.project_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own daily reports" ON public.project_daily_reports;
CREATE POLICY "Users can manage own daily reports"
  ON public.project_daily_reports FOR ALL
  USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND private.user_is_organization_member(organization_id, auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND private.user_is_organization_member(organization_id, auth.uid())
    )
  );
