"use client";

import { useState, useEffect } from "react";
import { getUserSecurityStatus } from "@/app/actions/user-settings";

// Define the shape of the data returned by your Server Action
export type SecurityStatus = Awaited<ReturnType<typeof getUserSecurityStatus>>;

export function useAdminPasswordCheck(initialData?: SecurityStatus) {
  const [state, setState] = useState({
    needsPasswordChange: initialData
      ? initialData.isOrganizationAdmin &&
        !initialData.hasChangedDefaultPassword
      : null,
    isOrganizationAdmin: initialData?.isOrganizationAdmin ?? false,
    organizationId: initialData?.organizationId ?? undefined,
    organizationName: initialData?.organizationName ?? null,
  });

  // If we have data, we aren't loading!
  const [isLoading, setIsLoading] = useState(!initialData);

  useEffect(() => {
    // If we already have data, skip the effect!
    if (initialData) return;

    let mounted = true;
    const checkStatus = async () => {
      try {
        setIsLoading(true);
        const status = await getUserSecurityStatus();
        if (mounted && status) {
          setState({
            isOrganizationAdmin: status.isOrganizationAdmin,
            organizationId: status.organizationId || undefined,
            organizationName: status.organizationName,
            needsPasswordChange:
              status.isOrganizationAdmin && !status.hasChangedDefaultPassword,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    checkStatus();
    return () => {
      mounted = false;
    };
  }, [initialData]);

  return {
    ...state,
    isLoading,
    markPasswordChanged: () =>
      setState((prev) => ({ ...prev, needsPasswordChange: false })),
  };
}
