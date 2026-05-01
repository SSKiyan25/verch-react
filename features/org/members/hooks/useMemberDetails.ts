"use client";

import { useState, useCallback } from "react";
import { getOrgMemberDetailAction } from "../actions/getOrgMemberDetailAction";
import type { OrgMemberDetail } from "@/lib/types/org-memberships";

type UseMemberDetailsReturn = {
  isOpen: boolean;
  memberDetail: OrgMemberDetail | null;
  isLoading: boolean;
  error: string | null;
  openMemberDetails: (orgId: string, memberId: string) => Promise<void>;
  closeMemberDetails: () => void;
};

export function useMemberDetails(): UseMemberDetailsReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [memberDetail, setMemberDetail] = useState<OrgMemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openMemberDetails = useCallback(async (orgId: string, memberId: string) => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setMemberDetail(null);

    const result = await getOrgMemberDetailAction({ orgId, memberId });

    setIsLoading(false);

    if (result.success && result.data) {
      setMemberDetail(result.data);
    } else if (!result.success) {
      setError(result.error);
    }
  }, []);

  const closeMemberDetails = useCallback(() => {
    setIsOpen(false);
    // Clear data after animation completes
    setTimeout(() => {
      setMemberDetail(null);
      setError(null);
    }, 200);
  }, []);

  return {
    isOpen,
    memberDetail,
    isLoading,
    error,
    openMemberDetails,
    closeMemberDetails,
  };
}
