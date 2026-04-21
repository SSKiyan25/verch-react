"use server";

import { invalidateUserCache } from "@/lib/data/cache-helpers";

export async function refreshUserCache(userId: string) {
  console.log(`[Server Action] Invalidating user cache for: ${userId}`);
  invalidateUserCache(userId);
}
