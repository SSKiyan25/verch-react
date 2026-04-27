"use client";

import Link from "next/link";
import { Users, UserCheck } from "lucide-react";
import type { DashboardPendingMembership } from "@/lib/types/org-dashboard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type DashboardPendingMembershipsProps = {
  memberships: DashboardPendingMembership[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPendingMemberships({
  memberships,
}: DashboardPendingMembershipsProps) {
  if (memberships.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-sky-500" />
          <h2 className="text-base font-semibold">Pending Memberships</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <UserCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No pending requests</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            All memberships are up to date
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-sky-500" />
          <h2 className="text-base font-semibold">Pending Memberships</h2>
          <span className="inline-flex items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400">
            {memberships.length}
          </span>
        </div>
        <Link
          href="/org/members"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Manage
        </Link>
      </div>

      <div className="divide-y divide-border/50">
        {memberships.slice(0, 5).map((membership) => (
          <div
            key={membership.id}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {membership.user_name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {membership.user_email}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(membership.created_at)}
              </span>
              <Link
                href={`/org/members`}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Review
              </Link>
            </div>
          </div>
        ))}
      </div>

      {memberships.length > 5 && (
        <div className="border-t border-border/50 px-4 py-2.5 text-center">
          <Link
            href="/org/members"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            +{memberships.length - 5} more pending
          </Link>
        </div>
      )}
    </div>
  );
}
