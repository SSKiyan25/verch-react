import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";
import type { StudentInfo } from "@/lib/supabase/queries/user-settings";

interface StudentIdStatusBadgeProps {
  status: StudentInfo["verification_status"];
}

const statusConfig: Record<
  StudentInfo["verification_status"],
  { label: string; className: string; icon?: boolean }
> = {
  unverified: {
    label: "Not Submitted",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  pending: {
    label: "Under Review",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  verified: {
    label: "Verified",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: true,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function StudentIdStatusBadge({ status }: StudentIdStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="secondary" className={config.className}>
      {config.icon && <BadgeCheck className="mr-1 h-3.5 w-3.5" />}
      {config.label}
    </Badge>
  );
}
