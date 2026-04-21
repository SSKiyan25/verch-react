"use client";

import { useState, useCallback } from "react";
import { changeUserPasswordAction } from "@/app/actions/user-settings";

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePassword = useCallback(async (data: ChangePasswordData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call Server Action directly
      // No need to pass orgID or check roles here; the server does it securely.
      const result = await changeUserPasswordAction(data);

      if (!result.success) {
        throw new Error(result.error || "Failed to change password");
      }

      return { success: true, message: result.message };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err.message || "An unexpected error occurred";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

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
