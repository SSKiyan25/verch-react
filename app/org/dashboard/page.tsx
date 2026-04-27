import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedOrgDashboard } from "@/lib/data/org/dashboard";
import { getCachedUserProfile } from "@/lib/data/user";
import { isOrganizationUser } from "@/lib/utils/org-helpers";
import { OrgDashboardShell } from "@/features/org/dashboard/components/OrgDashboardShell";

export default async function OrganizationDashboardPage() {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // 2. Get user profile for org context
  const userProfile = await getCachedUserProfile(authUser.id);

  if (!userProfile || !isOrganizationUser(userProfile.role)) {
    redirect("/login");
  }

  if (!userProfile.organization_id) {
    redirect("/login");
  }

  // 3. Fetch dashboard data
  const dashboardData = await getCachedOrgDashboard(
    authUser.id,
    userProfile.organization_id,
  );

  // 4. If data fetch fails, show empty state
  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 ring-1 ring-primary/20">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Overview of your store&apos;s performance
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Unable to load dashboard
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            We couldn&apos;t retrieve your dashboard data. This might be a
            temporary issue. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // 5. Render dashboard with data
  return <OrgDashboardShell data={dashboardData} />;
}
