"use client";

import Link from "next/link";
import {
  Plus,
  ShoppingCart,
  Percent,
  UserPlus,
  ArrowRight,
} from "lucide-react";

// ─── Action Config ────────────────────────────────────────────────────────────

type QuickAction = {
  label: string;
  description: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  gradient: string;
};

const actions: QuickAction[] = [
  {
    label: "Add Product",
    description: "Create a new product listing",
    href: "/org/products/create",
    icon: Plus,
    gradient: "from-primary/10 to-primary/5",
  },
  {
    label: "View Orders",
    description: "Manage incoming orders",
    href: "/org/orders",
    icon: ShoppingCart,
    gradient: "from-amber-500/10 to-amber-500/5",
  },
  {
    label: "Create Promotion",
    description: "Set up discounts & offers",
    href: "/org/promotions/new",
    icon: Percent,
    gradient: "from-accent/10 to-accent/5",
  },
  {
    label: "Invite Staff",
    description: "Add team members",
    href: "/org/members",
    icon: UserPlus,
    gradient: "from-sky-500/10 to-sky-500/5",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardQuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          >
            {/* Gradient background */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-200`}
            />

            <div className="relative z-10">
              <div className="mb-3 inline-flex rounded-lg bg-background/80 p-2.5 ring-1 ring-border backdrop-blur-sm">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {action.label}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {action.description}
              </p>
            </div>

            {/* Arrow indicator */}
            <ArrowRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-200 group-hover:text-foreground/70 group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}
