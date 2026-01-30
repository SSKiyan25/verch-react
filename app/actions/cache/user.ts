"use server";

import { invalidateCache, CACHE_KEYS, getTag } from "@/lib/cache";

export async function refreshUserCache(userId: string) {
  const tag = getTag(CACHE_KEYS.users.byId(userId));
  console.log(`[Server Action] Invalidating Cache Tag: ${tag}`);
  invalidateCache(tag);
}
