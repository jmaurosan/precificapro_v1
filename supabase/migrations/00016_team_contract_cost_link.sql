-- =====================================================
-- PRECIFICAPRO - Vinculo financeiro da contratacao
-- =====================================================
-- Liga o custo previsto da obra ao prestador/contato contratado,
-- evitando duplicidade ao salvar a contratacao mais de uma vez.

ALTER TABLE public.custos_projeto
  ADD COLUMN IF NOT EXISTS project_team_member_id UUID REFERENCES public.project_team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custos_projeto_team_member_id
  ON public.custos_projeto(project_team_member_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custos_projeto_unique_team_member
  ON public.custos_projeto(project_team_member_id);
