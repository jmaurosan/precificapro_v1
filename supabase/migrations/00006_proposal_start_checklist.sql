-- =====================================================
-- PRECIFICAPRO - Checklist pos-aceite / inicio de obra
-- =====================================================
-- Execute no SQL Editor do Supabase:
-- https://app.supabase.com/project/jgrboitrmckcdzdfzfkf/sql
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.proposal_start_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','skipped')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proposal_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_proposal_start_checklist_proposal_id
  ON public.proposal_start_checklist(proposal_id, sort_order);

DROP TRIGGER IF EXISTS proposal_start_checklist_updated_at ON public.proposal_start_checklist;
CREATE TRIGGER proposal_start_checklist_updated_at
  BEFORE UPDATE ON public.proposal_start_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.proposal_start_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own start checklist" ON public.proposal_start_checklist;
CREATE POLICY "Users can manage own start checklist"
  ON public.proposal_start_checklist FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = proposal_start_checklist.proposal_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = proposal_start_checklist.proposal_id
        AND p.user_id = auth.uid()
    )
  );

ALTER TABLE public.proposal_events
  DROP CONSTRAINT IF EXISTS proposal_events_event_type_check;

ALTER TABLE public.proposal_events
  ADD CONSTRAINT proposal_events_event_type_check CHECK (event_type IN (
    'created',
    'summary_copied',
    'sent_whatsapp',
    'public_link_created',
    'public_link_copied',
    'public_viewed',
    'accepted_internal',
    'accepted_public',
    'converted_to_project',
    'demo_created',
    'signed_contract_uploaded',
    'start_checklist_created',
    'start_checklist_item_done'
  ));
