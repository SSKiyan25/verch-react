"use client";

import { format } from "date-fns";
import { Eye, MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OrgMemberListItem } from "@/lib/types/org-memberships";
import { OrgMembersTableEmptyState } from "./OrgMembersTableEmptyState";
import { useMemberDetails } from "../hooks/useMemberDetails";
import { MemberDetailsModal } from "./MemberDetailsModal";

// ---------------------------------------------------------------------------
// Pagination sub-component
// ---------------------------------------------------------------------------

type PaginationRowProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
};

function PaginationRow({
  page,
  totalPages,
  totalCount,
  limit,
  onPageChange,
}: PaginationRowProps) {
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  if (totalPages <= 1) return null;

  // Build compact page number list: always show first, last, current ±1, with ellipsis
  const pageNumbers: Array<number | "ellipsis"> = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("ellipsis");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pageNumbers.push(i);
    }
    if (page < totalPages - 2) pageNumbers.push("ellipsis");
    pageNumbers.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t">
      <p className="text-sm text-muted-foreground">
        {totalCount > 0
          ? `Showing ${startItem}–${endItem} of ${totalCount} members`
          : "No members"}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          ‹
        </Button>

        {pageNumbers.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 text-muted-foreground text-sm"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(p)}
              className="min-w-8"
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          ›
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrgMembersTable
// ---------------------------------------------------------------------------

type OrgMembersTableProps = {
  members: OrgMemberListItem[];
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  orgId: string;
};

export function OrgMembersTable({
  members,
  totalCount,
  page,
  limit,
  onPageChange,
  orgId,
}: OrgMembersTableProps) {
  const totalPages = Math.ceil(totalCount / limit);
  const {
    isOpen,
    memberDetail,
    isLoading,
    error,
    openMemberDetails,
    closeMemberDetails,
  } = useMemberDetails();

  if (members.length === 0) {
    return <OrgMembersTableEmptyState />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Member</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell w-[140px]">
              Position
            </TableHead>
            <TableHead className="hidden lg:table-cell w-[120px]">
              Joined
            </TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {members.map((member) => {
            const initials = member.fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            const joinedAt = member.joinDate
              ? format(new Date(member.joinDate), "MMM d, yyyy")
              : "—";

            return (
              <TableRow key={member.memberId}>
                {/* Name + avatar */}
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={member.avatarUrl ?? undefined}
                        alt={member.fullName}
                      />
                      <AvatarFallback className="text-xs">
                        {initials || <User className="h-3.5 w-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm leading-tight">
                      {member.fullName || "—"}
                    </span>
                  </div>
                </TableCell>

                {/* Email */}
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {member.email}
                </TableCell>

                {/* Position */}
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {member.position || "—"}
                </TableCell>

                {/* Join Date */}
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {joinedAt}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openMemberDetails(orgId, member.memberId)}
                      aria-label="View member details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Member actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigator.clipboard.writeText(member.email)
                          }
                        >
                          Copy email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <PaginationRow
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={limit}
        onPageChange={onPageChange}
      />

      <MemberDetailsModal
        open={isOpen}
        onOpenChange={closeMemberDetails}
        memberDetail={memberDetail}
        isLoading={isLoading}
        error={error}
        orgId={orgId}
      />
    </div>
  );
}
