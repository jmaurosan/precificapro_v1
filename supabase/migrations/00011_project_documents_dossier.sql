-- =====================================================
-- PRECIFICAPRO - Dossie de Documentos da Obra
-- =====================================================

ALTER TABLE public.documents
  ALTER COLUMN client_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_categoria_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_categoria_check CHECK (categoria IN (
    'alvaras_licencas',
    'contratos',
    'art_rrt',
    'projetos_executivos',
    'laudos_tecnicos',
    'certificados_garantia',
    'notas_fiscais',
    'garantias_manuais',
    'entrega_obra'
  ));

CREATE INDEX IF NOT EXISTS idx_documents_project_id
  ON public.documents(project_id, data_upload DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload own project documents" ON storage.objects;
CREATE POLICY "Users can upload own project documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can read own project documents" ON storage.objects;
CREATE POLICY "Users can read own project documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can update own project documents" ON storage.objects;
CREATE POLICY "Users can update own project documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'project-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can delete own project documents" ON storage.objects;
CREATE POLICY "Users can delete own project documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
