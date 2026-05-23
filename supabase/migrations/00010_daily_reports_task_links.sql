-- =====================================================
-- PRECIFICAPRO - Vinculo Diario de Obra x Tarefas
-- =====================================================

ALTER TABLE public.project_daily_reports
  ADD COLUMN IF NOT EXISTS task_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS completed_task_ids JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_project_daily_reports_task_ids
  ON public.project_daily_reports USING GIN (task_ids);
