-- Fix temp-uploads bucket SELECT policy to allow public reads
-- This allows Next.js image optimization to fetch images anonymously via /_next/image
-- without getting 403 errors

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Allow authenticated downloads from temp-uploads" ON storage.objects;

-- Create a new policy that allows anyone (including anon) to read from temp-uploads
CREATE POLICY "Allow public downloads from temp-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'temp-uploads');
