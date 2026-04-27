"use client";

import { useState, useEffect } from "react";
import { getOrgGCashSettingsAction } from "@/features/user/orders/actions/getOrgGCashSettingsAction";

type GCashSettings = {
  number: string;
  accountName: string;
  qrImagePath: string | null;
};

export function useGCashSettings(orgId: string) {
  const [gcashSettings, setGcashSettings] = useState<GCashSettings | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      const result = await getOrgGCashSettingsAction(orgId);
      if (result.success) {
        setGcashSettings(result.gcash);
      }
      setIsLoading(false);
    }
    // console.log("[useGCashSettings] Fetching GCash settings for orgId:", orgId);
    fetchSettings();
  }, [orgId]);

  return { gcashSettings, isLoading };
}
