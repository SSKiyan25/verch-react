-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',               'avatars',               true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('student-ids',           'student-ids',           false, 2097152,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('membership-proofs',     'membership-proofs',     false, 2097152,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('product-images',        'product-images',        true,  52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']),
  ('product-bundle-images', 'product-bundle-images', true,  52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']),
  ('organization-images',   'organization-images',   true,  2097152,  ARRAY['image/jpeg','image/png','image/webp']),
  ('org-gcash-qr',          'org-gcash-qr',          true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('temp-uploads',          'temp-uploads',          true,  52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/webm'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ============================================================
-- STORAGE RLS POLICIES (safe: skip if already exists)
-- ============================================================

DO $$ BEGIN

  -- ----------------------------------------------------------
  -- AVATARS
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users can view avatars'
  ) THEN
    CREATE POLICY "Authenticated users can view avatars"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  -- ----------------------------------------------------------
  -- STUDENT IDS
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users and admins can view student IDs'
  ) THEN
    CREATE POLICY "Users and admins can view student IDs"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'student-ids'
        AND (
          (storage.foldername(name))[1] = (auth.uid())::text
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.role = 'admin'
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can upload their own student ID'
  ) THEN
    CREATE POLICY "Users can upload their own student ID"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'student-ids'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can update their own student ID'
  ) THEN
    CREATE POLICY "Users can update their own student ID"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'student-ids'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can delete their own student ID'
  ) THEN
    CREATE POLICY "Users can delete their own student ID"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'student-ids'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  -- ----------------------------------------------------------
  -- MEMBERSHIP PROOFS
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users and org members can view membership proofs'
  ) THEN
    CREATE POLICY "Users and org members can view membership proofs"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'membership-proofs'
        AND (
          (storage.foldername(name))[1] = (auth.uid())::text
          OR EXISTS (
            SELECT 1
            FROM users u
            JOIN student_organization_memberships som
              ON som.user_id = ((storage.foldername(objects.name))[1])::uuid
            WHERE u.id = auth.uid()
              AND u.organization_id = som.organization_id
              AND u.role = ANY (ARRAY['organization_admin','organization_manager'])
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can upload their own membership proof'
  ) THEN
    CREATE POLICY "Users can upload their own membership proof"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'membership-proofs'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can update their own membership proof'
  ) THEN
    CREATE POLICY "Users can update their own membership proof"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'membership-proofs'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can delete their own membership proof'
  ) THEN
    CREATE POLICY "Users can delete their own membership proof"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'membership-proofs'
        AND (storage.foldername(name))[1] = (auth.uid())::text
      );
  END IF;

  -- ----------------------------------------------------------
  -- PRODUCT IMAGES
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can view product images'
  ) THEN
    CREATE POLICY "Public can view product images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Org admins can upload product images'
  ) THEN
    CREATE POLICY "Org admins can upload product images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'product-images'
        AND auth.uid() IN (
          SELECT users.id FROM users
          WHERE users.role = ANY (ARRAY['organization_admin','organization_manager'])
        )
      );
  END IF;

  -- ----------------------------------------------------------
  -- PRODUCT BUNDLE IMAGES
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can view product bundle images'
  ) THEN
    CREATE POLICY "Public can view product bundle images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-bundle-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Org admins can upload product bundle images'
  ) THEN
    CREATE POLICY "Org admins can upload product bundle images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'product-bundle-images'
        AND auth.uid() IN (
          SELECT users.id FROM users
          WHERE users.role = ANY (ARRAY['organization_admin','organization_manager'])
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Org admins can update product bundle images'
  ) THEN
    CREATE POLICY "Org admins can update product bundle images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'product-bundle-images'
        AND auth.uid() IN (
          SELECT users.id FROM users
          WHERE users.role = ANY (ARRAY['organization_admin','organization_manager'])
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Org admins can delete product bundle images'
  ) THEN
    CREATE POLICY "Org admins can delete product bundle images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'product-bundle-images'
        AND auth.uid() IN (
          SELECT users.id FROM users
          WHERE users.role = ANY (ARRAY['organization_admin','organization_manager'])
        )
      );
  END IF;

  -- ----------------------------------------------------------
  -- ORGANIZATION IMAGES
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Allow public read'
  ) THEN
    CREATE POLICY "Allow public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'organization-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Allow authenticated uploads'
  ) THEN
    CREATE POLICY "Allow authenticated uploads"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'organization-images'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Allow users to delete own files'
  ) THEN
    CREATE POLICY "Allow users to delete own files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'organization-images'
        AND (auth.uid())::text = (storage.foldername(name))[1]
      );
  END IF;

  -- ----------------------------------------------------------
  -- ORG GCASH QR
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public users can view GCash QR codes'
  ) THEN
    CREATE POLICY "Public users can view GCash QR codes"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'org-gcash-qr');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Org admins can upload GCash QR codes'
  ) THEN
    CREATE POLICY "Org admins can upload GCash QR codes"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'org-gcash-qr'
        AND auth.uid() IN (
          SELECT users.id FROM users
          WHERE (users.organization_id)::text = (storage.foldername(objects.name))[1]
            AND users.role = ANY (ARRAY['organization_admin','organization_manager'])
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Org admins can update GCash QR codes'
  ) THEN
    CREATE POLICY "Org admins can update GCash QR codes"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'org-gcash-qr'
        AND auth.uid() IN (
          SELECT users.id FROM users
          WHERE (users.organization_id)::text = (storage.foldername(objects.name))[1]
            AND users.role = ANY (ARRAY['organization_admin','organization_manager'])
        )
      )
      WITH CHECK (
        bucket_id = 'org-gcash-qr'
        AND auth.uid() IN (
          SELECT users.id FROM users
          WHERE (users.organization_id)::text = (storage.foldername(objects.name))[1]
            AND users.role = ANY (ARRAY['organization_admin','organization_manager'])
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Org admins can delete GCash QR codes'
  ) THEN
    CREATE POLICY "Org admins can delete GCash QR codes"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'org-gcash-qr'
        AND auth.uid() IN (
          SELECT users.id FROM users
          WHERE (users.organization_id)::text = (storage.foldername(objects.name))[1]
            AND users.role = ANY (ARRAY['organization_admin','organization_manager'])
        )
      );
  END IF;

  -- ----------------------------------------------------------
  -- TEMP UPLOADS
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Allow authenticated downloads from temp-uploads'
  ) THEN
    CREATE POLICY "Allow authenticated downloads from temp-uploads"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'temp-uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Allow authenticated uploads to temp-uploads'
  ) THEN
    CREATE POLICY "Allow authenticated uploads to temp-uploads"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'temp-uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Allow authenticated deletes from temp-uploads'
  ) THEN
    CREATE POLICY "Allow authenticated deletes from temp-uploads"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'temp-uploads');
  END IF;

END $$;