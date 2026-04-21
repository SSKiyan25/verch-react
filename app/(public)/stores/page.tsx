import { cacheLife, cacheTag } from "next/cache";
import { getPublicStores } from "@/lib/supabase/queries/stores";
import {
  StoresHeader,
  StoresSearchBar,
  StoresGrid,
  StoresPagination,
} from "@/features/public/stores";

type Props = {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
};

async function getCachedStores(search: string | undefined, page: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("public-stores");

  return getPublicStores({ search, page, pageSize: 20 });
}

export default async function StoresPage({ searchParams }: Props) {
  const { search, page: pageParam } = await searchParams;
  const page = pageParam ? Number(pageParam) : 1;

  const { stores, totalCount, totalPages } = await getCachedStores(
    search,
    page,
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <StoresHeader />
        <StoresSearchBar defaultValue={search} />
        <hr className="border-gray-300" />
        <StoresGrid stores={stores} totalCount={totalCount} />
        <StoresPagination page={page} totalPages={totalPages} />
      </div>
    </main>
  );
}
