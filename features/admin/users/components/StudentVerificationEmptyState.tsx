"use client";

import { FileSearch, Clock, BadgeCheck, XCircle } from "lucide-react";
import type { StudentVerificationStatus } from "@/lib/types/admin-student-verifications";

type EmptyConfig = {
  icon: typeof FileSearch;
  title: string;
  description: string;
};

const EMPTY_STATE_CONFIG: Record<string, EmptyConfig> = {
  all: {
    icon: FileSearch,
    title: "No verification requests",
    description:
      "Student ID verification requests will appear here once submitted.",
  },
  pending: {
    icon: Clock,
    title: "No pending verifications",
    description: "All verification requests have been reviewed.",
  },
  verified: {
    icon: BadgeCheck,
    title: "No verified students yet",
    description: "Approved student IDs will appear here.",
  },
  rejected: {
    icon: XCircle,
    title: "No rejected submissions",
    description: "Rejected verification requests will appear here.",
  },
};

type StudentVerificationEmptyStateProps = {
  currentStatus?: StudentVerificationStatus;
};

export function StudentVerificationEmptyState({
  currentStatus,
}: StudentVerificationEmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[currentStatus ?? "all"];
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
