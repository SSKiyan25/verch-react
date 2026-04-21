"use client";

import { Clock, Users, XCircle, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MembershipStatus } from "@/lib/types/org-memberships";

type EmptyConfig = {
  icon: typeof Clock;
  title: string;
  description: string;
};

const EMPTY_STATE_CONFIG: Record<string, EmptyConfig> = {
  pending: {
    icon: Clock,
    title: "No pending applications",
    description:
      "Membership applications will appear here when students apply.",
  },
  active: {
    icon: Users,
    title: "No active members yet",
    description: "Approved members will appear here.",
  },
  rejected: {
    icon: XCircle,
    title: "No rejected applications",
    description: "Rejected membership applications will appear here.",
  },
  inactive: {
    icon: UserMinus,
    title: "No inactive members",
    description: "Revoked or expired memberships will appear here.",
  },
  search: {
    icon: Users,
    title: "No members found",
    description: "Try adjusting your search terms or filters.",
  },
};

type MembersEmptyStateProps = {
  currentStatus?: MembershipStatus;
  hasSearch: boolean;
  onClear?: () => void;
};

export function MembersEmptyState({
  currentStatus = "pending",
  hasSearch,
  onClear,
}: MembersEmptyStateProps) {
  const config = hasSearch
    ? EMPTY_STATE_CONFIG.search
    : EMPTY_STATE_CONFIG[currentStatus];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-lg bg-muted/30">
      <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {config.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {config.description}
      </p>
      {onClear && (
        <Button variant="outline" onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
