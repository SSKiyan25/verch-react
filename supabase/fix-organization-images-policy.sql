-- Fix for organization-images bucket: Add missing UPDATE policy
-- This allows users to overwrite files when uploading with upsert: true

-- Drop existing policy if it exists (for re-running safety)
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;

-- Create the UPDATE policy for organization-images bucket
CREATE POLICY "Allow authenticated updates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'organization-images'
    AND auth.role() = 'authenticated'
  );

-- Verify all policies now exist
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read (public)'
    WHEN cmd = 'INSERT' THEN 'Upload (authenticated)'
    WHEN cmd = 'UPDATE' THEN 'Update/Overwrite (authenticated)'
    WHEN cmd = 'DELETE' THEN 'Delete (owner)'
  END as description
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (qual ILIKE '%organization-images%' OR with_check ILIKE '%organization-images%')
ORDER BY cmd;
