import { createClient } from "@supabase/supabase-js";

// Reuse the same public (no-auth) client pattern
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
};

async function fetchPublicCategories(
  orgId?: string,
): Promise<PublicCategory[]> {
  const { data, error } = await supabase.rpc("get_public_categories", {
    p_org_id: orgId ?? null,
  });

  if (error)
    throw new Error(`get_public_categories RPC failed: ${error.message}`);
  return (data as PublicCategory[]) ?? [];
}

export { fetchPublicCategories as getPublicCategories };
