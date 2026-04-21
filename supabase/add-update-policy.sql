DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Allow authenticated updates'
  ) THEN
    CREATE POLICY "Allow authenticated updates"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'organization-images'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;
