"use client";

import { LayoutDashboard } from "lucide-react";
import type { OrgDashboardData } from "@/lib/types/org-dashboard";
import { DashboardStatCards } from "./DashboardStatCards";
import { DashboardQuickActions } from "./DashboardQuickActions";
import { DashboardPendingOrders } from "./DashboardPendingOrders";
import { DashboardPendingMemberships } from "./DashboardPendingMemberships";
import { DashboardRecentOrders } from "./DashboardRecentOrders";

// ─── Props ────────────────────────────────────────────────────────────────────

type OrgDashboardShellProps = {
  data: OrgDashboardData;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OrgDashboardShell({ data }: OrgDashboardShellProps) {
  const { stats, pending_orders, pending_memberships, recent_orders } = data;

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 ring-1 ring-primary/20">
          <LayoutDashboard className="h-6 w-6 text-primary" />
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

      {/* Quick Actions */}
      <DashboardQuickActions />

      {/* Stat Cards */}
      <DashboardStatCards stats={stats} />

      {/* Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <DashboardPendingOrders orders={pending_orders} />
        </div>
        <div className="lg:col-span-1">
          <DashboardPendingMemberships memberships={pending_memberships} />
        </div>
        <div className="lg:col-span-1">
          <DashboardRecentOrders orders={recent_orders} />
        </div>
      </div>
    </div>
  );
}
