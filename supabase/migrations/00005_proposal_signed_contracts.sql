-- =====================================================
-- PRECIFICAPRO - Contratos assinados em propostas
-- =====================================================
-- Execute no SQL Editor do Supabase:
-- https://app.supabase.com/project/jgrboitrmckcdzdfzfkf/sql
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proposal-contracts',
  'proposal-contracts',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.proposal_contract_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'signed' CHECK (status IN ('draft','sent','signed','cancelled')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_proposal_contract_files_proposal_id
  ON public.proposal_contract_files(proposal_id, uploaded_at DESC);

ALTER TABLE public.proposal_contract_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own proposal contract files" ON public.proposal_contract_files;
CREATE POLICY "Users can manage own proposal contract files"
  ON public.proposal_contract_files FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = proposal_contract_files.proposal_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = proposal_contract_files.proposal_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can upload own proposal contracts" ON storage.objects;
CREATE POLICY "Users can upload own proposal contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proposal-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can read own proposal contracts" ON storage.objects;
CREATE POLICY "Users can read own proposal contracts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proposal-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can update own proposal contracts" ON storage.objects;
CREATE POLICY "Users can update own proposal contracts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'proposal-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'proposal-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can delete own proposal contracts" ON storage.objects;
CREATE POLICY "Users can delete own proposal contracts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'proposal-contracts'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
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
    'signed_contract_uploaded'
  ));
