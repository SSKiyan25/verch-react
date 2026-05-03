-- RPC: get_org_gcash_config
-- Purpose: Returns GCash payment configuration for an org.
-- Accessible by any authenticated user (customers need this at checkout).
-- Only exposes the public-facing GCash payment details — no sensitive org data.

CREATE OR REPLACE FUNCTION public.get_org_gcash_config(p_org_id UUID)
RETURNS TABLE (
  out_has_gcash           BOOLEAN,
  out_gcash_number        TEXT,
  out_gcash_account_name  TEXT,
  out_gcash_qr_image_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings JSONB;
BEGIN
  SELECT o.settings INTO v_settings
  FROM public.organizations o
  WHERE o.id = p_org_id
    AND o.status = 'active'::organization_status;

  IF NOT FOUND OR v_settings IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (
      (v_settings -> 'gcash') IS NOT NULL
      AND jsonb_typeof(v_settings -> 'gcash') = 'object'
      AND COALESCE(v_settings -> 'gcash' ->> 'number', '') != ''
      AND COALESCE(v_settings -> 'gcash' ->> 'accountName', '') != ''
    )                                                           AS out_has_gcash,
    COALESCE(v_settings -> 'gcash' ->> 'number', '')::TEXT      AS out_gcash_number,
    COALESCE(v_settings -> 'gcash' ->> 'accountName', '')::TEXT AS out_gcash_account_name,
    (v_settings -> 'gcash' ->> 'qrImagePath')::TEXT             AS out_gcash_qr_image_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_gcash_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_gcash_config(UUID) TO anon;

NOTIFY pgrst, 'reload schema';
