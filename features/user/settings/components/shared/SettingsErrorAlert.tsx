"use client";

import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SettingsErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function SettingsErrorAlert({
  message,
  onDismiss,
}: SettingsErrorAlertProps) {
  useEffect(() => {
    if (onDismiss) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [onDismiss]);

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
