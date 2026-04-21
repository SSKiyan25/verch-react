"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useTransition, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminUserCard } from "@/features/admin/users/components/AdminUserCard";
import { AdminUserEmptyState } from "@/features/admin/users/components/AdminUserEmptyState";
import type { AdminUserListItem, UserRole } from "@/lib/types/admin-users";

const ROLE_OPTIONS = [
  { label: "All Roles", value: "all" },
  { label: "Platform Admin", value: "admin" },
  { label: "Customer", value: "customer" },
  { label: "Organization Admin", value: "organization_admin" },
  { label: "Organization Manager", value: "organization_manager" },
  { label: "Organization Staff", value: "organization_staff" },
] as const;

type AdminUsersShellProps = {
  users: AdminUserListItem[];
  totalCount: number;
  currentRole?: UserRole | "all";
  currentSearch?: string;
  currentPage: number;
  totalPages: number;
  pendingVerificationCount: number;
};

export function AdminUsersShell({
  users,
  totalCount,
  currentRole,
  currentSearch,
  currentPage,
  totalPages,
  pendingVerificationCount,
}: AdminUsersShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearch ?? "");

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSize = 20;
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const updateFilters = useCallback(
    (updates: { search?: string; role?: UserRole | "all"; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Reset to page 1 when search or role changes
      if ("search" in updates || "role" in updates) {
        params.delete("page");
      }

      if ("search" in updates) {
        if (updates.search) {
          params.set("search", updates.search);
        } else {
          params.delete("search");
        }
      }

      if ("role" in updates) {
        if (updates.role && updates.role !== "all") {
          params.set("role", updates.role);
        } else {
          params.delete("role");
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
        router.replace(`/admin/users?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all platform users
          </p>
        </div>

        {/* Pending Verifications Button */}
        {pendingVerificationCount > 0 && (
          <Button
            asChild
            variant="outline"
            className="cursor-pointer relative transition-colors duration-200"
          >
            <Link href="/admin/users/verifications">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Student Verifications
              <Badge
                variant="destructive"
                className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-xs font-semibold"
              >
                {pendingVerificationCount}
              </Badge>
            </Link>
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
        </form>

        {/* Role Filter */}
        <Select
          value={currentRole ?? "all"}
          onValueChange={(value) =>
            updateFilters({ role: value as UserRole | "all" })
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {users.length === 0 ? (
        <AdminUserEmptyState
          currentRole={currentRole}
          hasSearch={Boolean(currentSearch)}
        />
      ) : (
        <>
          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">User</TableHead>
                  <TableHead className="w-[140px] hidden md:table-cell">
                    Role
                  </TableHead>
                  <TableHead className="w-[200px] hidden lg:table-cell">
                    Organization
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-[120px] text-right">Joined</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <AdminUserCard key={user.id} user={user} />
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
