"use client";

import { useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGCashProofUploader } from "@/features/user/orders/hooks/useGCashProofUploader";

interface GCashProofUploaderProps {
  orderId: string;
  currentProofPath: string | null;
}

export function GCashProofUploader({
  orderId,
  currentProofPath,
}: GCashProofUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentSignedUrl,
    previewUrl,
    isLoadingExisting,
    isUploading,
    error,
    onFileSelect,
    onUpload,
    onReset,
  } = useGCashProofUploader({ orderId, currentProofPath });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    // Reset input so same file can be reselected
    e.target.value = "";
  };

  const displayUrl = previewUrl ?? currentSignedUrl;
  const isReplacing = !!currentSignedUrl && !!previewUrl;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Payment Proof</p>

      {/* Current / preview image */}
      {isLoadingExisting ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading existing proof...</span>
        </div>
      ) : displayUrl ? (
        <div className="relative">
          {isReplacing && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1.5">
              New image selected — click &quot;Upload Proof&quot; to replace
            </p>
          )}
          {currentSignedUrl && !previewUrl && (
            <p className="text-xs text-muted-foreground mb-1.5">
              Current proof
            </p>
          )}
          <div className="relative w-full max-w-xs rounded-lg overflow-hidden border bg-muted">
            <Image
              src={displayUrl}
              alt="Payment proof"
              width={320}
              height={200}
              className="object-contain w-full h-auto"
              unoptimized // Signed URL is dynamic
            />
          </div>
          {previewUrl && (
            <button
              type="button"
              onClick={onReset}
              className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background transition-colors"
              aria-label="Remove selected image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : null}

      {/* File picker area */}
      {!previewUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 w-full max-w-xs",
            "border-2 border-dashed rounded-lg p-6 text-sm text-muted-foreground",
            "hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer",
          )}
        >
          <ImageIcon className="h-8 w-8 opacity-50" />
          <span>
            {currentSignedUrl ? "Click to replace" : "Click to select image"}
          </span>
          <span className="text-xs">JPG, PNG, WEBP · max 10MB</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Upload button — only shown when a new file is selected */}
      <div className="flex items-center gap-2">
        {previewUrl && (
          <Button
            onClick={() => void onUpload()}
            disabled={isUploading}
            size="sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                Upload Proof
              </>
            )}
          </Button>
        )}
        {previewUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isUploading}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
