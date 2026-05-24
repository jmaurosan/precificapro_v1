-- =====================================================
-- PRECIFICAPRO - Vinculo de prestadores na equipe da obra
-- =====================================================
-- Permite adicionar prestadores cadastrados à equipe/comunicacao
-- da obra sem perder suporte a contatos avulsos.

ALTER TABLE public.project_team_members
  ADD COLUMN IF NOT EXISTS prestador_id UUID REFERENCES public.prestadores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_team_members_prestador_id
  ON public.project_team_members(prestador_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_team_members_unique_project_prestador
  ON public.project_team_members(project_id, prestador_id)
  WHERE prestador_id IS NOT NULL;
