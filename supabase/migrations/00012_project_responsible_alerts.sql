-- =====================================================
-- PRECIFICAPRO - Responsavel da Obra para Alertas
-- =====================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS responsible_name TEXT,
  ADD COLUMN IF NOT EXISTS responsible_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_responsible_phone
  ON public.projects(responsible_phone);
