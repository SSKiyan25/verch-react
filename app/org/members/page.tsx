import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getCachedOrgMembershipApplications,
  getCachedOrgMembers,
} from "@/lib/data/org/memberships";
import { MembersShell } from "@/features/org/members/components/MembersShell";
import { OrgMembersShell } from "@/features/org/members/components/OrgMembersShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MembershipStatus } from "@/lib/types/org-memberships";

type PageProps = {
  searchParams: Promise<{
    // shared
    tab?: string;
    // applications tab
    status?: string;
    // members table tab
    limit?: string;
    // shared between tabs
    search?: string;
    page?: string;
  }>;
};

const DEFAULT_LIMIT = 20;

export default async function OrgMembersPage({ searchParams }: PageProps) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2. Role gate — org admin or manager only
  const { data: userRecord } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (
    !userRecord ||
    !userRecord.organization_id ||
    !["organization_admin", "organization_manager"].includes(
      userRecord.role ?? "",
    )
  ) {
    redirect("/login");
  }

  const orgId = userRecord.organization_id;

  // 3. Parse shared url params
  const params = await searchParams;
  const activeTab = params.tab === "members" ? "members" : "applications";
  const search = params.search;
  const page = Math.max(1, Number(params.page ?? 1));

  // ── Applications tab params ──────────────────────────────────────────────
  const status = (params.status as MembershipStatus | undefined) ?? "pending";
  const appLimit = 25;

  // ── Members table tab params ─────────────────────────────────────────────
  const limit = Number(params.limit ?? DEFAULT_LIMIT);

  // 4. Fetch both datasets in parallel
  const [applicationsResult, membersResult] = await Promise.all([
    getCachedOrgMembershipApplications(
      orgId,
      { status, search },
      page,
      appLimit,
    ),
    getCachedOrgMembers(orgId, limit, (page - 1) * limit, search),
  ]);

  // 5. Status counts (applications tab)
  const statusCounts: Record<MembershipStatus, number> = {
    pending: 0,
    active: 0,
    rejected: 0,
    inactive: 0,
  };
  if (status && applicationsResult.totalCount > 0) {
    statusCounts[status] = applicationsResult.totalCount;
  }

  // 6. Render with Tabs
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage membership applications and view active members.
        </p>
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="applications" asChild>
            <a href="/org/members?tab=applications">Applications</a>
          </TabsTrigger>
          <TabsTrigger value="members" asChild>
            <a href="/org/members?tab=members">Active Members</a>
          </TabsTrigger>
        </TabsList>

        {/* Applications tab */}
        <TabsContent value="applications" className="mt-4">
          <MembersShell
            members={applicationsResult.items}
            totalCount={applicationsResult.totalCount}
            statusCounts={statusCounts}
            currentStatus={status}
            currentSearch={search}
            currentPage={page}
          />
        </TabsContent>

        {/* Active members table tab */}
        <TabsContent value="members" className="mt-4">
          <OrgMembersShell
            result={membersResult}
            currentSearch={search ?? ""}
            currentLimit={limit}
            currentPage={page}
            orgId={orgId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const metadata = {
  title: "Members — Verch",
};
