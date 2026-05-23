-- =====================================================
-- PRECIFICAPRO - Tarefas / Checklist de Execucao da Obra
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.project_execution_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  schedule_event_id UUID REFERENCES public.schedule_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  phase TEXT NOT NULL DEFAULT 'Geral',
  responsible TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_execution_tasks_project_status
  ON public.project_execution_tasks(project_id, status);

CREATE INDEX IF NOT EXISTS idx_project_execution_tasks_project_due_date
  ON public.project_execution_tasks(project_id, due_date);

CREATE INDEX IF NOT EXISTS idx_project_execution_tasks_user_id
  ON public.project_execution_tasks(user_id);

DROP TRIGGER IF EXISTS project_execution_tasks_updated_at ON public.project_execution_tasks;
CREATE TRIGGER project_execution_tasks_updated_at
  BEFORE UPDATE ON public.project_execution_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.project_execution_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own execution tasks" ON public.project_execution_tasks;
CREATE POLICY "Users can manage own execution tasks"
  ON public.project_execution_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
