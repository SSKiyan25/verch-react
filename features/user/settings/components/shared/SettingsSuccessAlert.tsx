"use client";

import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";

interface SettingsSuccessAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function SettingsSuccessAlert({
  message,
  onDismiss,
}: SettingsSuccessAlertProps) {
  useEffect(() => {
    if (onDismiss) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [onDismiss]);

  return (
    <Alert className="border-green-500/50 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400">
      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
