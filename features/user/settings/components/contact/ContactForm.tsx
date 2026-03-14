"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { SettingsPageHeader } from "@/features/user/settings/components/shared/SettingsPageHeader";
import { SettingsSaveButton } from "@/features/user/settings/components/shared/SettingsSaveButton";
import { SettingsSuccessAlert } from "@/features/user/settings/components/shared/SettingsSuccessAlert";
import { SettingsErrorAlert } from "@/features/user/settings/components/shared/SettingsErrorAlert";
import { updateContactNumber } from "@/features/user/settings/actions/profileActions";

interface ContactFormProps {
  currentNumber: string | null;
}

export function ContactForm({ currentNumber }: ContactFormProps) {
  const router = useRouter();

  const [contactNumber, setContactNumber] = useState(currentNumber ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    if (!contactNumber.trim() || contactNumber.trim().length < 7) {
      setFieldError("Please enter a valid contact number (at least 7 digits)");
      return;
    }

    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const result = await updateContactNumber(contactNumber.trim());

    setIsLoading(false);

    if (result.success) {
      setSuccessMsg("Contact number updated successfully.");
      router.refresh();
    } else {
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Contact"
        description="Manage your contact information."
      />

      {!currentNumber && (
        <Alert className="border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription>
            Add your contact number to unlock checkout.
          </AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <SettingsSuccessAlert
          message={successMsg}
          onDismiss={() => setSuccessMsg(null)}
        />
      )}
      {errorMsg && (
        <SettingsErrorAlert
          message={errorMsg}
          onDismiss={() => setErrorMsg(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div className="space-y-2">
          <Label htmlFor="contactNumber">Contact Number</Label>
          <Input
            id="contactNumber"
            type="tel"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="e.g. 09171234567"
            required
          />
          <p className="text-xs text-muted-foreground">
            Your contact number is required to place orders.
          </p>
          {fieldError && (
            <p className="text-sm text-destructive">{fieldError}</p>
          )}
        </div>

        <SettingsSaveButton isLoading={isLoading} />
      </form>
    </div>
  );
}
