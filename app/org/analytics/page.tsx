import { redirect } from "next/navigation";
import { Suspense } from "react";
import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCachedOrgAnalytics } from "@/lib/data/org/analytics";
import { isOrganizationUser } from "@/lib/utils/org-helpers";
import { AnalyticsDashboard } from "@/features/org/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsGranularity } from "@/features/org/analytics";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics — Verch" };

// ─── Types ────────────────────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<{
    start?: string;
    end?: string;
    granularity?: string;
  }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveOrgSlug(orgName: string): string {
  return orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildDefaultDateRange() {
  const today = new Date();
  return {
    start: format(subDays(today, 29), "yyyy-MM-dd"),
    end: format(today, "yyyy-MM-dd"),
    granularity: "day" as AnalyticsGranularity,
  };
}

// ─── Full-page skeleton shown during Suspense ─────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OrgAnalyticsPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  // 2. Fetch user record for role + org
  const { data: userRecord } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (
    !userRecord ||
    !userRecord.organization_id ||
    !isOrganizationUser(userRecord.role ?? "")
  ) {
    redirect("/login");
  }

  const orgId = userRecord.organization_id;

  // 3. Fetch org name for display + slug derivation
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  const orgName = org?.name ?? "Your Organization";
  const orgSlug = deriveOrgSlug(orgName);

  // 4. Resolve date range from URL params or default
  const params = await searchParams;
  const g = params.granularity;
  const granularity: AnalyticsGranularity =
    g === "day" || g === "week" || g === "month" ? g : "day";

  const defaults = buildDefaultDateRange();
  const dateRange = {
    start: params.start ?? defaults.start,
    end: params.end ?? defaults.end,
    granularity,
  };

  // 5. Fetch initial analytics data (server-side, cached)
  const initialData = await getCachedOrgAnalytics(
    orgId,
    orgSlug,
    dateRange.start,
    dateRange.end,
    dateRange.granularity,
  );

  // Guard: data layer returns null only if auth fails (shouldn't happen here)
  if (!initialData) redirect("/login");

  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnalyticsDashboard
        orgId={orgId}
        orgSlug={orgSlug}
        orgName={orgName}
        initialData={initialData}
      />
    </Suspense>
  );
}
