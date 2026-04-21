"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MembershipApplicationCard } from "@/features/org/members/components/MembershipApplicationCard";
import { MembersEmptyState } from "@/features/org/members/components/MembersEmptyState";
import { useMemberFilters } from "@/features/org/members/hooks/useMemberFilters";
import { useMembershipApproval } from "@/features/org/members/hooks/useMembershipApproval";
import { ApproveMembershipDialog } from "@/features/org/members/components/ApproveMembershipDialog";
import { RejectMembershipDialog } from "@/features/org/members/components/RejectMembershipDialog";
import { RevokeMembershipDialog } from "@/features/org/members/components/RevokeMembershipDialog";
import type {
  OrgMembershipApplicationItem,
  MembershipStatus,
} from "@/lib/types/org-memberships";

const STATUS_TABS: Array<{
  label: string;
  value: MembershipStatus | undefined;
}> = [
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Rejected", value: "rejected" },
  { label: "Inactive", value: "inactive" },
];

type MembersShellProps = {
  members: OrgMembershipApplicationItem[];
  totalCount: number;
  statusCounts: Record<MembershipStatus, number>;
  currentStatus?: MembershipStatus;
  currentSearch?: string;
  currentPage: number;
};

export function MembersShell({
  members,
  totalCount,
  statusCounts,
  currentStatus = "pending",
  currentSearch,
  currentPage,
}: MembersShellProps) {
  const [searchInput, setSearchInput] = useState(currentSearch ?? "");
  const [approveDialogMemberId, setApproveDialogMemberId] = useState<
    string | null
  >(null);

  const { updateFilters, clearFilters, isPending } = useMemberFilters({
    status: currentStatus,
    search: currentSearch,
    page: currentPage,
  });

  const {
    isPending: isActionPending,
    approve,
    reject,
    revoke,
    rejectDialog,
    setRejectDialog,
    revokeDialog,
    setRevokeDialog,
  } = useMembershipApproval();

  const pageSize = 25;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    updateFilters({ search: trimmed || undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateFilters({ search: undefined });
  };

  const hasActiveFilters = !!(
    currentSearch ||
    (currentStatus && currentStatus !== "pending")
  );

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage membership applications and roles
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="pl-9"
        />
        {currentSearch && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max pb-1">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.value === currentStatus;
            const count = statusCounts[tab.value!] ?? 0;
            return (
              <button
                key={tab.label}
                onClick={() => updateFilters({ status: tab.value })}
                disabled={isPending}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  isPending && "opacity-50 cursor-not-allowed",
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full",
                      isActive
                        ? "bg-background/20"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {members.length === 0 ? (
        <MembersEmptyState
          currentStatus={currentStatus}
          hasSearch={!!currentSearch}
          onClear={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Member Name</TableHead>
                  <TableHead className="w-[100px] text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-[100px] text-center hidden md:table-cell">
                    Academic Year
                  </TableHead>
                  <TableHead className="w-[120px] hidden lg:table-cell">
                    Position
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    {currentStatus === "active" ? "Joined" : "Applied"}
                  </TableHead>
                  <TableHead className="w-[140px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <MembershipApplicationCard
                    key={member.id}
                    member={member}
                    onApprove={() => setApproveDialogMemberId(member.id)}
                    onReject={() =>
                      setRejectDialog({ open: true, membershipId: member.id })
                    }
                    onRevoke={() =>
                      setRevokeDialog({ open: true, membershipId: member.id })
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters({ page: currentPage - 1 })}
                disabled={!hasPrev || isPending}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                {startItem}–{endItem} of {totalCount}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters({ page: currentPage + 1 })}
                disabled={!hasNext || isPending}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      {approveDialogMemberId && (
        <ApproveMembershipDialog
          open={!!approveDialogMemberId}
          onOpenChange={(open: boolean) =>
            !open && setApproveDialogMemberId(null)
          }
          memberName={
            members.find((m) => m.id === approveDialogMemberId)?.user_name ??
            "this member"
          }
          onConfirm={(position?: string) => {
            approve(approveDialogMemberId, position, handleRefresh);
            setApproveDialogMemberId(null);
          }}
          isPending={isActionPending}
        />
      )}

      {rejectDialog.membershipId && (
        <RejectMembershipDialog
          open={rejectDialog.open}
          onOpenChange={(open: boolean) =>
            setRejectDialog({ open, membershipId: rejectDialog.membershipId })
          }
          memberName={
            members.find((m) => m.id === rejectDialog.membershipId)
              ?.user_name ?? "this member"
          }
          onConfirm={(reason: string) => {
            reject(rejectDialog.membershipId!, reason, handleRefresh);
          }}
          isPending={isActionPending}
        />
      )}

      {revokeDialog.membershipId && (
        <RevokeMembershipDialog
          open={revokeDialog.open}
          onOpenChange={(open: boolean) =>
            setRevokeDialog({ open, membershipId: revokeDialog.membershipId })
          }
          memberName={
            members.find((m) => m.id === revokeDialog.membershipId)
              ?.user_name ?? "this member"
          }
          onConfirm={(reason?: string) => {
            revoke(revokeDialog.membershipId!, reason, handleRefresh);
          }}
          isPending={isActionPending}
        />
      )}
    </div>
  );
}
