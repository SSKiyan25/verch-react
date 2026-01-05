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
  const sentCodeRef = useRef<string | null>(null);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Simple email validation
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Generate 6-digit code
  const generateCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

  // Start resend cooldown
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

  // Send verification code (simulated)
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
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const newCode = generateCode();
      sentCodeRef.current = newCode;

      console.log(`📧 Verification code sent to ${state.email}: ${newCode}`);

      setState((prev) => ({
        ...prev,
        isCodeSent: true,
        isLoading: false,
      }));

      startCooldown();
      return true;
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to send verification code. Please try again.",
      }));
      return false;
    }
  }, [state.email, startCooldown]);

  // Verify code (simulated)
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
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const isValid = state.verificationCode === sentCodeRef.current;

      if (isValid) {
        setState((prev) => ({
          ...prev,
          isVerified: true,
          isLoading: false,
          error: null,
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Invalid verification code. Please try again.",
        }));
        return false;
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Verification failed. Please try again.",
      }));
      return false;
    }
  }, [state.verificationCode]);

  // Resend code
  const resendCode = useCallback(async (): Promise<boolean> => {
    if (!state.canResend) return false;

    setState((prev) => ({ ...prev, verificationCode: "", error: null }));
    return await sendVerificationCode();
  }, [state.canResend, sendVerificationCode]);

  // Reset state
  const reset = useCallback(() => {
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    sentCodeRef.current = null;
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
