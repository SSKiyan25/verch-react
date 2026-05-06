"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePaymentSubmit } from "../hooks/usePaymentSubmit";
import { PaymentScreenshotPreview } from "./PaymentScreenshotPreview";
import { getPaymentProofPreviewUrl } from "../actions/getPaymentProofPreviewUrl";

interface PaymentUploadFormProps {
  orderId: string;
  onUploadComplete?: (path: string, url: string) => void;
  disabled?: boolean;
  shouldResetUpload?: boolean;
}

/**
 * Component: PaymentUploadForm
 *
 * File upload form for GCash payment screenshots.
 * Uploads to Firebase Storage and triggers automatic OCR verification.
 *
 * Features:
 * - Drag-and-drop support
 * - File validation (type, size)
 * - Preview before upload
 * - Loading states
 * - Error handling with retry
 */
export function PaymentUploadForm({
  orderId,
  onUploadComplete,
  disabled = false,
  shouldResetUpload = false,
}: PaymentUploadFormProps) {
  const {
    uploadPaymentProof,
    resetUpload,
    isUploading,
    error,
    uploadedPath,
    uploadedUrl,
  } = usePaymentSubmit();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [signedPreviewUrl, setSignedPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file || null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file || null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    resetUpload();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreviewClick = async () => {
    setIsLoadingPreview(true);
    try {
      const result = await getPaymentProofPreviewUrl(orderId);
      
      if (result.success) {
        setSignedPreviewUrl(result.url);
        setIsPreviewOpen(true);
      } else {
        toast.error("Preview unavailable", {
          description: result.error,
        });
      }
    } catch {
      toast.error("Preview failed", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadPaymentProof(orderId, selectedFile);

    if (result.success && result.path && result.url && onUploadComplete) {
      onUploadComplete(result.path, result.url);
    }
  };

  const hasUploadedFile = uploadedPath && uploadedUrl;
  
  // Reset upload state when parent signals completion
  useEffect(() => {
    if (shouldResetUpload && hasUploadedFile) {
      // Clear the upload state after a brief delay to allow UI transition
      const timer = setTimeout(() => {
        resetUpload();
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldResetUpload, hasUploadedFile, resetUpload]);

  return (
    <div className="space-y-4">
      <Label htmlFor="payment-screenshot" className="text-sm font-medium">
        Payment Screenshot
      </Label>

      {/* Upload Area */}
      {!selectedFile && !hasUploadedFile && (
        <div
          className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="mb-3 h-10 w-10 text-gray-400" />
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PNG, JPG, or WebP (max 5MB)
          </p>
          <input
            ref={fileInputRef}
            id="payment-screenshot"
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* Preview & Upload Button */}
      {selectedFile && previewUrl && !hasUploadedFile && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Payment screenshot preview"
              className="h-auto w-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={isUploading}
              className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow-md transition-colors hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700"
              aria-label="Remove file"
            >
              <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || disabled}
            className="w-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Verify Payment
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Success - Verification In Progress */}
      {hasUploadedFile && (
        <div className="space-y-3">
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Processing your payment screenshot...</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Our system is automatically verifying your GCash payment. This usually takes 10-30 seconds.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={disabled}
                  className="text-blue-700 hover:bg-blue-100 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-blue-900 dark:hover:text-blue-100"
                >
                  Replace
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          {/* Preview Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviewClick}
            disabled={isLoadingPreview || disabled}
            className="w-full"
          >
            {isLoadingPreview ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Loading preview...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-3 w-3" />
                Preview Uploaded Image
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Upload failed</p>
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedFile && handleUpload()}
                disabled={isUploading || !selectedFile}
                className="mt-2"
              >
                Retry Upload
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Modal */}
      <PaymentScreenshotPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        proofUrl={signedPreviewUrl}
      />
    </div>
  );
}
