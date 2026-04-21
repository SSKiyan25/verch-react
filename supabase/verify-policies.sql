SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND (qual ILIKE '%organization-images%' OR with_check ILIKE '%organization-images%') ORDER BY cmd;
