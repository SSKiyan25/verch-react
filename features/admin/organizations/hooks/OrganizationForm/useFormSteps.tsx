"use client";

import { useState, useCallback } from "react";

export type FormStep = "email" | "verification" | "details" | "complete";
export type FormMode = "create" | "edit";

export interface FormStepState {
  currentStep: FormStep;
  mode: FormMode;
  canProceed: boolean;
  canGoBack: boolean;
}

const STEP_ORDER: FormStep[] = ["email", "verification", "details", "complete"];

export function useFormSteps(initialMode: FormMode = "create") {
  const [currentStep, setCurrentStep] = useState<FormStep>(
    initialMode === "edit" ? "details" : "email"
  );
  const [mode] = useState<FormMode>(initialMode);
  const [canProceed, setCanProceed] = useState(false);

  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const canGoBack = currentIndex > 0;

  const nextStep = useCallback(() => {
    if (canProceed && currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
      setCanProceed(false); // Reset for next step
    }
  }, [canProceed, currentIndex]);

  const prevStep = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [currentIndex]);

  const reset = useCallback(() => {
    setCurrentStep(mode === "edit" ? "details" : "email");
    setCanProceed(false);
  }, [mode]);

  return {
    state: {
      currentStep,
      mode,
      canProceed,
      canGoBack,
    },
    actions: {
      nextStep,
      prevStep,
      setCanProceed,
      reset,
    },
  };
}
