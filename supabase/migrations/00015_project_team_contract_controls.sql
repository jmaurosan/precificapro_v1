-- =====================================================
-- PRECIFICAPRO - Controle de contratacao da equipe da obra
-- =====================================================
-- Adiciona status, valor combinado, data prevista e escopo ao
-- vinculo entre obra e prestador/contato.

ALTER TABLE public.project_team_members
  ADD COLUMN IF NOT EXISTS contract_status TEXT NOT NULL DEFAULT 'cotado'
    CHECK (contract_status IN ('cotado','contratado','em_execucao','concluido','cancelado')),
  ADD COLUMN IF NOT EXISTS agreed_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_start_date DATE,
  ADD COLUMN IF NOT EXISTS scope_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_project_team_members_contract_status
  ON public.project_team_members(contract_status);
