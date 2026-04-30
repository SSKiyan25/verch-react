/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useRef } from "react";

export interface EmailVerificationState {
  email: string;
  verificationCode: string;
  isCodeSent: boolean;
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
  canResend: boolean;
  resendCooldown: number;
}

const INITIAL_STATE: EmailVerificationState = {
  email: "",
  verificationCode: "",
  isCodeSent: false,
  isVerified: false,
  isLoading: false,
  error: null,
  canResend: false,
  resendCooldown: 0,
};

export function useEmailVerification() {
  const [state, setState] = useState<EmailVerificationState>(INITIAL_STATE);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const setEmail = useCallback((email: string) => {
    setState((prev) => ({
      ...prev,
      email: email.trim().toLowerCase(),
      error: null,
      isVerified: false,
      isCodeSent: false,
    }));
  }, []);

  const setVerificationCode = useCallback((code: string) => {
    const numericCode = code.replace(/\D/g, "").slice(0, 6);
    setState((prev) => ({
      ...prev,
      verificationCode: numericCode,
      error: null,
    }));
  }, []);

  const startCooldown = useCallback(() => {
    setState((prev) => ({ ...prev, canResend: false, resendCooldown: 60 }));

    resendTimerRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.resendCooldown <= 1) {
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
            resendTimerRef.current = null;
          }
          return { ...prev, canResend: true, resendCooldown: 0 };
        }
        return { ...prev, resendCooldown: prev.resendCooldown - 1 };
      });
    }, 1000);
  }, []);

  const sendVerificationCode = useCallback(async (): Promise<boolean> => {
    if (!validateEmail(state.email)) {
      setState((prev) => ({
        ...prev,
        error: "Please enter a valid email address",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: state.email,
          type: "organization_verification",
        }),
      });

      // Check response status BEFORE parsing JSON
      if (!response.ok) {
        let errorMessage = "Failed to send verification code";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // Response is not JSON (likely HTML error page)
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        isCodeSent: true,
        isLoading: false,
      }));

      startCooldown();
      return true;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error.message ||
          "Failed to send verification code. Please try again.",
      }));
      return false;
    }
  }, [state.email, startCooldown]);

  const verifyCode = useCallback(async (): Promise<boolean> => {
    if (state.verificationCode.length !== 6) {
      setState((prev) => ({
        ...prev,
        error: "Please enter the complete 6-digit code",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: state.email,
          code: state.verificationCode,
        }),
      });

      // Check response status BEFORE parsing JSON
      if (!response.ok) {
        let errorMessage = "Verification failed";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // Response is not JSON (likely HTML error page)
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        isVerified: true,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Verification failed. Please try again.",
      }));
      return false;
    }
  }, [state.email, state.verificationCode]);

  const resendCode = useCallback(async (): Promise<boolean> => {
    if (!state.canResend) return false;

    setState((prev) => ({ ...prev, verificationCode: "", error: null }));
    return await sendVerificationCode();
  }, [state.canResend, sendVerificationCode]);

  const reset = useCallback(() => {
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    actions: {
      setEmail,
      setVerificationCode,
      sendVerificationCode,
      verifyCode,
      resendCode,
      reset,
      clearError,
    },
  };
}
