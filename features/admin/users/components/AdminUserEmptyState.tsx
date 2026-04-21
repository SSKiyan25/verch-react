"use client";

import { Users, UserSearch } from "lucide-react";
import type { UserRole } from "@/lib/types/admin-users";

type EmptyConfig = {
  icon: typeof Users;
  title: string;
  description: string;
};

const EMPTY_STATE_CONFIG: Record<string, EmptyConfig> = {
  all: {
    icon: Users,
    title: "No users found",
    description: "Try adjusting your search or filter criteria.",
  },
  search: {
    icon: UserSearch,
    title: "No matching users",
    description: "We couldn't find any users matching your search.",
  },
  admin: {
    icon: Users,
    title: "No platform admins",
    description: "No users with platform administrator role.",
  },
  customer: {
    icon: Users,
    title: "No customers",
    description: "No regular customer accounts found.",
  },
  organization_admin: {
    icon: Users,
    title: "No organization admins",
    description: "No users with organization admin role.",
  },
  organization_manager: {
    icon: Users,
    title: "No organization managers",
    description: "No users with organization manager role.",
  },
  organization_staff: {
    icon: Users,
    title: "No organization staff",
    description: "No users with organization staff role.",
  },
};

type AdminUserEmptyStateProps = {
  currentRole?: UserRole | "all";
  hasSearch?: boolean;
};

export function AdminUserEmptyState({
  currentRole,
  hasSearch,
}: AdminUserEmptyStateProps) {
  const configKey = hasSearch ? "search" : (currentRole ?? "all");
  const config = EMPTY_STATE_CONFIG[configKey];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-lg bg-muted/30">
      <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {config.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {config.description}
      </p>
    </div>
  );
}
