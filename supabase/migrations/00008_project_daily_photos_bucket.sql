-- =====================================================
-- PRECIFICAPRO - Bucket privado para fotos do Diario de Obra
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-daily-photos',
  'project-daily-photos',
  false,
  8388608,
  ARRAY[
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

DROP POLICY IF EXISTS "Users can upload own project daily photos" ON storage.objects;
CREATE POLICY "Users can upload own project daily photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-daily-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can read own project daily photos" ON storage.objects;
CREATE POLICY "Users can read own project daily photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-daily-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can update own project daily photos" ON storage.objects;
CREATE POLICY "Users can update own project daily photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-daily-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'project-daily-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can delete own project daily photos" ON storage.objects;
CREATE POLICY "Users can delete own project daily photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-daily-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
