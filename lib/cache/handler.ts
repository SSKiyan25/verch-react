import { unstable_cache, revalidateTag } from "next/cache";

export const getTag = (parts: (string | number | null | undefined)[]) =>
  parts.filter(Boolean).join("-");

export async function cachedQuery<T>(
  queryFn: () => Promise<T>,
  keyParts: string[],
  tags: string[] = [],
  ttl: number = 3600,
): Promise<T> {
  const finalTags = tags.length > 0 ? tags : [getTag(keyParts)];
  return unstable_cache(queryFn, keyParts, {
    tags: finalTags,
    revalidate: ttl,
  })();
}

export function invalidateCache(tag: string) {
  revalidateTag(tag, "default");
}
