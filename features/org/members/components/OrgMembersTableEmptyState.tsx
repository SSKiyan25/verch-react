import { Users } from "lucide-react";

export function OrgMembersTableEmptyState() {
  return (
    <div className="rounded-md border">
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No members found</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Try adjusting your search or filters. Active members will appear
            here once they have been approved.
          </p>
        </div>
      </div>
    </div>
  );
}
