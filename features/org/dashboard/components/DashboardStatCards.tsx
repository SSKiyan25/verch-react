"use client";

import { ShoppingCart, Clock, TrendingUp, Package } from "lucide-react";
import type { OrgDashboardStats } from "@/lib/types/org-dashboard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Stat Card Config ─────────────────────────────────────────────────────────

type StatCardConfig = {
  label: string;
  value: string | number;
  icon: React.FC<{ className?: string }>;
  trend?: { value: string; positive: boolean };
  accentClass: string; // Tailwind border/ring accent
  iconBgClass: string;
};

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accentClass,
  iconBgClass,
}: StatCardConfig) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group ${accentClass}`}
    >
      {/* Background decorative gradient */}
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-[0.07] dark:opacity-[0.12] bg-gradient-to-br from-current to-transparent pointer-events-none" />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {trend && (
            <p
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                trend.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              <span className="text-[10px]">{trend.positive ? "▲" : "▼"}</span>
              {trend.value}
            </p>
          )}
        </div>
        <div
          className={`rounded-lg p-2.5 ${iconBgClass} transition-colors group-hover:scale-110 duration-200`}
        >
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type DashboardStatCardsProps = {
  stats: OrgDashboardStats;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardStatCards({ stats }: DashboardStatCardsProps) {
  const cards: StatCardConfig[] = [
    {
      label: "Pending Orders",
      value: stats.pending_orders,
      icon: Clock,
      accentClass: "border-l-4 border-l-amber-500",
      iconBgClass: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Orders Today",
      value: stats.orders_today,
      icon: ShoppingCart,
      accentClass: "border-l-4 border-l-primary",
      iconBgClass: "bg-primary/10 dark:bg-primary/20",
    },
    {
      label: "Revenue Today",
      value: formatCurrency(stats.revenue_today),
      icon: TrendingUp,
      accentClass: "border-l-4 border-l-emerald-500",
      iconBgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Active Products",
      value: stats.active_products,
      icon: Package,
      accentClass: "border-l-4 border-l-sky-500",
      iconBgClass: "bg-sky-100 dark:bg-sky-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
