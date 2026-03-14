"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SettingsSaveButtonProps {
  isLoading: boolean;
  label?: string;
}

export function SettingsSaveButton({
  isLoading,
  label = "Save Changes",
}: SettingsSaveButtonProps) {
  return (
    <Button type="submit" disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
