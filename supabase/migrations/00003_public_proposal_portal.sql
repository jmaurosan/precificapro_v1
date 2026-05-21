-- =====================================================
-- PRECIFICAPRO - Portal publico de proposta por token
-- =====================================================
-- Execute no SQL Editor do Supabase:
-- https://app.supabase.com/project/jgrboitrmckcdzdfzfkf/sql
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS private;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_token_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_approved_by TEXT;

CREATE INDEX IF NOT EXISTS idx_proposals_public_token
  ON public.proposals(public_token)
  WHERE public_token IS NOT NULL;

CREATE OR REPLACE FUNCTION private.proposal_notes_to_jsonb(raw_notes TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF raw_notes IS NULL OR btrim(raw_notes) = '' THEN
    RETURN '{}'::JSONB;
  END IF;

  BEGIN
    RETURN raw_notes::JSONB;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('notes', raw_notes);
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_proposal(proposal_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  proposal_record RECORD;
  items JSONB;
  office JSONB;
BEGIN
  IF proposal_token IS NULL OR length(proposal_token) < 24 THEN
    RETURN NULL;
  END IF;

  SELECT p.*
  INTO proposal_record
  FROM public.proposals p
  WHERE p.public_token = proposal_token
    AND p.status IN ('sent', 'approved')
  LIMIT 1;

  IF proposal_record.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pi.id,
      'description', pi.description,
      'unit', pi.unit,
      'quantity', pi.quantity,
      'unitPrice', pi.unit_price,
      'category', pi.category
    )
    ORDER BY pi.created_at
  ), '[]'::JSONB)
  INTO items
  FROM public.proposal_items pi
  WHERE pi.proposal_id = proposal_record.id;

  SELECT jsonb_build_object(
    'name', COALESCE(pr.company_name, proposal_record.company_name, 'Escritorio'),
    'email', pr.email,
    'phone', pr.phone,
    'website', pr.website,
    'cnpj', pr.cnpj,
    'logo', pr.avatar_url,
    'address', pr.address
  )
  INTO office
  FROM public.profiles pr
  WHERE pr.id = proposal_record.user_id;

  RETURN jsonb_build_object(
    'id', proposal_record.id,
    'proposalNumber', proposal_record.proposal_number,
    'proposalDate', proposal_record.proposal_date,
    'client', proposal_record.client_name,
    'projectName', COALESCE(proposal_record.project_name, 'Geral'),
    'total', proposal_record.total,
    'status', proposal_record.status,
    'notes', private.proposal_notes_to_jsonb(proposal_record.observacoes),
    'items', items,
    'office', COALESCE(office, jsonb_build_object('name', proposal_record.company_name))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_public_proposal(
  proposal_token TEXT,
  signer_name TEXT DEFAULT NULL,
  signer_email TEXT DEFAULT NULL,
  acceptance_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  proposal_record RECORD;
  current_notes JSONB;
  accepted_at TIMESTAMPTZ := NOW();
BEGIN
  IF proposal_token IS NULL OR length(proposal_token) < 24 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Token invalido.');
  END IF;

  SELECT p.*
  INTO proposal_record
  FROM public.proposals p
  WHERE p.public_token = proposal_token
    AND p.status IN ('sent', 'approved')
  LIMIT 1;

  IF proposal_record.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Proposta nao encontrada.');
  END IF;

  current_notes := private.proposal_notes_to_jsonb(proposal_record.observacoes);

  UPDATE public.proposals
  SET
    status = 'approved',
    public_approved_at = COALESCE(public_approved_at, accepted_at),
    public_approved_by = COALESCE(NULLIF(signer_name, ''), proposal_record.client_name),
    observacoes = (
      current_notes || jsonb_build_object(
        'acceptedAt', COALESCE(current_notes->>'acceptedAt', accepted_at::TEXT),
        'acceptedBy', COALESCE(NULLIF(signer_name, ''), proposal_record.client_name),
        'acceptedEmail', COALESCE(NULLIF(signer_email, ''), ''),
        'acceptanceMethod', 'public_link',
        'acceptanceNotes', COALESCE(NULLIF(acceptance_notes, ''), 'Aceite registrado pelo portal publico do cliente.')
      )
    )::TEXT
  WHERE id = proposal_record.id;

  IF proposal_record.client_id IS NOT NULL THEN
    UPDATE public.clients
    SET status = 'contratado'
    WHERE id = proposal_record.client_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Proposta aprovada com sucesso.',
    'acceptedAt', accepted_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_proposal(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_public_proposal(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
