/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/hooks/use-user";

export function useAdminPasswordCheck() {
  const [needsPasswordChange, setNeedsPasswordChange] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    const checkPasswordChangeRequired = () => {
      if (userLoading) return;
      console.log("User loaded:", user);
      if (!user) {
        setNeedsPasswordChange(null);
        setIsLoading(false);
        return;
      }

      // Only organization admins need to change their default password
      if (user.role !== "organization_admin") {
        setNeedsPasswordChange(false);
        setIsLoading(false);
        return;
      }

      // Check if organization admin has changed their default password
      const hasChangedDefaultPassword =
        (user as any).has_changed_default_password ?? false;

      setNeedsPasswordChange(!hasChangedDefaultPassword);
      setIsLoading(false);
    };

    checkPasswordChangeRequired();
  }, [user, userLoading]);

  const markPasswordChanged = () => {
    setNeedsPasswordChange(false);
  };

  return {
    needsPasswordChange,
    isLoading,
    markPasswordChanged,
    isOrganizationAdmin: user?.role === "organization_admin",
  };
}
