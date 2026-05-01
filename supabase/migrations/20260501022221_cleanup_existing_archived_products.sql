-- =====================================================================
-- Migration: Cleanup Existing Archived Products
-- Date: 2026-05-01
-- =====================================================================
--
-- This migration fixes existing products that have is_archived = TRUE
-- but status != 'archived'. This is a one-time data cleanup for
-- products that were archived before the archive_product RPC was fixed.
--
-- Must run AFTER: 20260501021441_fix_archive_and_promotion_rollback.sql
--
-- =====================================================================

-- Fix existing archived products to have correct status
UPDATE public.products
SET 
  status = 'archived'::product_status,
  updated_at = NOW()
WHERE is_archived = TRUE 
  AND status != 'archived'::product_status;
