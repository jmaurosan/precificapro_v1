-- =====================================================
-- PRECIFICAPRO - Auditoria comercial de propostas
-- =====================================================
-- Execute no SQL Editor do Supabase:
-- https://app.supabase.com/project/jgrboitrmckcdzdfzfkf/sql
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.proposal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'summary_copied',
    'sent_whatsapp',
    'public_link_created',
    'public_link_copied',
    'public_viewed',
    'accepted_internal',
    'accepted_public',
    'converted_to_project',
    'demo_created'
  )),
  title TEXT NOT NULL,
  details TEXT,
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user','client','system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal_id
  ON public.proposal_events(proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_events_user_id
  ON public.proposal_events(user_id, created_at DESC);

ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own proposal events" ON public.proposal_events;
CREATE POLICY "Users can read own proposal events"
  ON public.proposal_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = proposal_events.proposal_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own proposal events" ON public.proposal_events;
CREATE POLICY "Users can create own proposal events"
  ON public.proposal_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = proposal_events.proposal_id
        AND p.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.record_public_proposal_event(
  proposal_token TEXT,
  event_type_to_record TEXT,
  event_title TEXT DEFAULT NULL,
  event_details TEXT DEFAULT NULL,
  event_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal_record RECORD;
BEGIN
  IF proposal_token IS NULL OR length(proposal_token) < 24 THEN
    RETURN FALSE;
  END IF;

  IF event_type_to_record NOT IN ('public_viewed', 'accepted_public') THEN
    RETURN FALSE;
  END IF;

  SELECT id, user_id
  INTO proposal_record
  FROM public.proposals
  WHERE public_token = proposal_token
  LIMIT 1;

  IF proposal_record.id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.proposal_events (
    user_id,
    proposal_id,
    event_type,
    title,
    details,
    actor_type,
    metadata
  )
  VALUES (
    proposal_record.user_id,
    proposal_record.id,
    event_type_to_record,
    COALESCE(event_title, CASE
      WHEN event_type_to_record = 'accepted_public' THEN 'Proposta aprovada pelo cliente'
      ELSE 'Proposta visualizada pelo cliente'
    END),
    event_details,
    'client',
    COALESCE(event_metadata, '{}'::JSONB)
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_public_proposal_event(TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
