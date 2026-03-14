"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveAvatarToProfile } from "@/features/user/settings/actions/profileActions";

interface AvatarUploadProps {
  currentUrl: string | null;
  fullName: string;
  userId: string;
  // onChange: (url: string, path: string) => void;
}

export function AvatarUpload({
  currentUrl,
  fullName,
  userId,
  // onChange,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);

  const initials = fullName?.charAt(0)?.toUpperCase() ?? "?";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    setIsUploading(true);

    try {
      const supabase = createClient();

      // Step 1: Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        // toast.error("Failed to upload avatar");
        console.error("[AvatarUpload] upload error", uploadError);
        setError(uploadError.message);
        return;
      }

      // Step 2: Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      // Step 3: Persist to DB immediately — don't wait for form save
      const result = await saveAvatarToProfile({
        avatar_url: publicUrl,
        avatar_path: path,
      });

      if (!result.success) {
        toast.error("Uploaded but failed to save. Please try again.");
        setError(result.error);
        return;
      }

      // Step 4: Update local UI state
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setPreviewUrl(urlWithTimestamp);
      // onChange(publicUrl, path); // notify parent so form state stays in sync
      toast.success("Avatar updated successfully");
    } catch {
      // console.log("[AvatarUpload] Unexpected error");
      toast.error("Failed to upload avatar");
      setError("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={fullName}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
            {initials}
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">Click to upload. Max 2MB.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
