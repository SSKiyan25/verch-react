"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateGCashSettingsAction } from "@/features/org/settings/actions/updateGCashSettingsAction";

type UseGCashSettingsProps = {
  orgId: string;
  initialGcash?: {
    number?: string;
    accountName?: string;
    qrImagePath?: string | null;
  } | null;
};

export function useGCashSettings({
  orgId,
  initialGcash,
}: UseGCashSettingsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [number, setNumber] = useState(initialGcash?.number ?? "");
  const [accountName, setAccountName] = useState(
    initialGcash?.accountName ?? "",
  );
  const [qrImagePath, setQrImagePath] = useState<string | null>(
    initialGcash?.qrImagePath ?? null,
  );
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    number !== (initialGcash?.number ?? "") ||
    accountName !== (initialGcash?.accountName ?? "") ||
    qrImagePath !== (initialGcash?.qrImagePath ?? null);

  async function uploadQrImage(
    file: File,
  ): Promise<{ path: string; publicUrl: string } | null> {
    setIsUploading(true);
    try {
      const filePath = `${orgId}/qr.png`;

      const { error: uploadError } = await supabase.storage
        .from("org-gcash-qr")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        toast.error("Failed to upload QR code");
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("org-gcash-qr")
        .getPublicUrl(filePath);

      return { path: filePath, publicUrl: urlData.publicUrl };
    } catch {
      toast.error("Failed to upload QR code");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleQrFileSelect(file: File) {
    // Show preview immediately (local blob URL)
    const localPreview = URL.createObjectURL(file);
    setQrPreviewUrl(localPreview);

    // Upload to storage
    const result = await uploadQrImage(file);
    if (result) {
      setQrImagePath(result.path);
      // Replace blob preview with public URL
      setQrPreviewUrl(result.publicUrl);
    } else {
      // Upload failed — clear preview
      setQrPreviewUrl(null);
      setQrImagePath(initialGcash?.qrImagePath ?? null);
    }
  }

  function handleRemoveQr() {
    setQrImagePath(null);
    setQrPreviewUrl(null);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await updateGCashSettingsAction(orgId, {
        number,
        accountName,
        qrImagePath,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("GCash settings saved");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save GCash settings",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Get QR preview URL (either from state or derive from initial path)
  const qrUrl =
    qrPreviewUrl ??
    (initialGcash?.qrImagePath
      ? supabase.storage
          .from("org-gcash-qr")
          .getPublicUrl(initialGcash.qrImagePath).data.publicUrl
      : null);

  return {
    // Form values
    number,
    setNumber,
    accountName,
    setAccountName,
    // QR state
    qrPreviewUrl: qrUrl,
    handleQrFileSelect,
    handleRemoveQr,
    // Actions
    handleSave,
    // Loading states
    isUploading,
    isSaving,
    hasChanges,
  };
}
