/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { useUser } from "@/lib/hooks/use-user";

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const changePassword = useCallback(
    async (data: ChangePasswordData) => {
      if (!user?.organization_id) {
        setError("User organization not found");
        return { success: false };
      }

      if (user.role !== "organization_admin") {
        setError("Only organization admins can change passwords");
        return { success: false };
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/organizations/${user.organization_id}/settings/change-password`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(data),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to change password");
        }

        return { success: true, message: result.message };
      } catch (err: any) {
        const errorMessage = err.message || "An unexpected error occurred";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.organization_id, user?.role]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    changePassword,
    isLoading,
    error,
    clearError,
  };
}
