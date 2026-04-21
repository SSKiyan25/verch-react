"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StudentVerificationCard } from "@/features/admin/users/components/StudentVerificationCard";
import { StudentVerificationEmptyState } from "@/features/admin/users/components/StudentVerificationEmptyState";
import type {
  StudentVerificationListItem,
  StudentVerificationStatus,
} from "@/lib/types/admin-student-verifications";

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" as const },
  { label: "Verified", value: "verified" as const },
  { label: "Rejected", value: "rejected" as const },
] as const;

type StudentVerificationsShellProps = {
  verifications: StudentVerificationListItem[];
  totalCount: number;
  currentStatus?: StudentVerificationStatus;
  currentPage: number;
};

export function StudentVerificationsShell({
  verifications,
  totalCount,
  currentStatus,
  currentPage,
}: StudentVerificationsShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const pageSize = 25;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const updateFilters = useCallback(
    (updates: { status?: StudentVerificationStatus; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Reset to page 1 when status changes
      if ("status" in updates) {
        params.delete("page");
        if (updates.status) {
          params.set("status", updates.status);
        } else {
          params.delete("status");
        }
      }

      if ("page" in updates && updates.page !== undefined) {
        if (updates.page > 1) {
          params.set("page", String(updates.page));
        } else {
          params.delete("page");
        }
      }

      startTransition(() => {
        router.replace(`/admin/users/verifications?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Student ID Verifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and verify student ID submissions
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max pb-1">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.value === currentStatus;
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {verifications.length === 0 ? (
        <StudentVerificationEmptyState currentStatus={currentStatus} />
      ) : (
        <>
          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Student Name</TableHead>
                  <TableHead className="w-[120px]">ID Number</TableHead>
                  <TableHead className="w-[140px] hidden md:table-cell">
                    College
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    Submitted
                  </TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map((verification) => (
                  <StudentVerificationCard
                    key={verification.id}
                    verification={verification}
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
    </div>
  );
}
