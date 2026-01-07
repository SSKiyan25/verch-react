"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Image as ImageIcon,
  X,
  Camera,
  CheckCircle,
  Info,
  Building2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ImageWithLoading } from "@/components/ui/image-with-loading";
import { useImageManagement } from "../hooks/useImageManagement";

interface ImageData {
  logo_image_url?: string;
  logo_image_path?: string;
  cover_image_url?: string;
  cover_image_path?: string;
  images_url?: { url: string; path: string }[];
}

interface ImagesSectionProps {
  data: ImageData;
  organizationId: string;
  onUpdate: (data: Partial<ImageData>) => Promise<void>;
  isLoading?: boolean;
  isComplete?: boolean;
}

type ConfirmAction = {
  type: "logo" | "cover" | "gallery";
  index?: number;
} | null;

export function ImagesSection({
  data,
  organizationId,
  onUpdate,
  isLoading = false,
  isComplete = false,
}: ImagesSectionProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const {
    loadingStates,
    isUploading,
    handleLogoUpload,
    handleCoverUpload,
    handleGalleryUpload,
    handleRemoveLogo,
    handleRemoveCover,
    handleRemoveGalleryImage,
  } = useImageManagement(organizationId, onUpdate);

  const isDisabled = isLoading || isUploading;

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "cover" | "gallery"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      switch (type) {
        case "logo":
          await handleLogoUpload(file, data);
          break;
        case "cover":
          await handleCoverUpload(file, data);
          break;
        case "gallery":
          await handleGalleryUpload(file, data);
          break;
      }
    } catch (error) {
      console.error(`${type} upload failed:`, error);
    } finally {
      event.target.value = "";
    }
  };

  const handleConfirmRemove = async () => {
    if (!confirmAction) return;

    try {
      switch (confirmAction.type) {
        case "logo":
          await handleRemoveLogo(data);
          break;
        case "cover":
          await handleRemoveCover(data);
          break;
        case "gallery":
          if (confirmAction.index !== undefined) {
            await handleRemoveGalleryImage(confirmAction.index, data);
          }
          break;
      }
    } catch (error) {
      console.error("Remove failed:", error);
    }
  };

  const getConfirmContent = () => {
    if (!confirmAction) return { title: "", description: "" };

    switch (confirmAction.type) {
      case "logo":
        return {
          title: "Remove Organization Logo",
          description:
            "Are you sure you want to remove the organization logo? This action cannot be undone.",
        };
      case "cover":
        return {
          title: "Remove Cover Image",
          description:
            "Are you sure you want to remove the cover image? This action cannot be undone.",
        };
      case "gallery":
        return {
          title: "Remove Gallery Image",
          description:
            "Are you sure you want to remove this gallery image? This action cannot be undone.",
        };
      default:
        return { title: "", description: "" };
    }
  };

  const { title, description } = getConfirmContent();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <ImageIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <CardTitle className="flex items-center gap-2">
                  Organization Images
                  {isComplete && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Logo, cover image, and gallery photos
                </p>
              </div>
            </div>
            <Badge
              variant={isComplete ? "default" : "secondary"}
              className="text-xs w-fit"
            >
              {isComplete ? "Complete" : "Incomplete"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Upload Guidelines */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Image Guidelines:</strong> Upload high-quality images
              (PNG, JPG, WebP). Logo: 400x400px recommended. Cover: 1200x400px
              recommended. Max 2MB per image.
            </AlertDescription>
          </Alert>

          {/* Logo Upload */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organization Logo
            </h4>
            {data.logo_image_url ? (
              <div className="relative inline-block">
                <ImageWithLoading
                  src={data.logo_image_url}
                  alt="Organization Logo"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-cover rounded-lg border"
                  unoptimized
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                  onClick={() => setConfirmAction({ type: "logo" })}
                  disabled={isDisabled}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(e, "logo")}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  id="logo-upload"
                  disabled={isDisabled}
                />
                <label
                  htmlFor="logo-upload"
                  className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg transition-colors ${
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:border-muted-foreground/50"
                  }`}
                >
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground text-center">
                    {loadingStates.logo ? "Uploading..." : "Upload Logo"}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Cover Image
            </h4>
            {data.cover_image_url ? (
              <div className="relative inline-block">
                <ImageWithLoading
                  src={data.cover_image_url}
                  alt="Cover Image"
                  width={448}
                  height={128}
                  className="w-full max-w-md h-32 object-cover rounded-lg border"
                  unoptimized
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 w-6 h-6 p-0 rounded-full"
                  onClick={() => setConfirmAction({ type: "cover" })}
                  disabled={isDisabled}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(e, "cover")}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  id="cover-upload"
                  disabled={isDisabled}
                />
                <label
                  htmlFor="cover-upload"
                  className={`flex flex-col items-center justify-center w-full max-w-md h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg transition-colors ${
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:border-muted-foreground/50"
                  }`}
                >
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {loadingStates.cover
                      ? "Uploading..."
                      : "Upload Cover Image"}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Gallery Images */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Gallery Images (Optional)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.images_url?.map((image, index) => (
                <div key={index} className="relative group">
                  <ImageWithLoading
                    src={image.url}
                    alt={`Gallery ${index + 1}`}
                    width={100}
                    height={96}
                    className="w-full h-24 object-cover rounded-lg border"
                    unoptimized
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setConfirmAction({ type: "gallery", index })}
                    disabled={isDisabled}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {/* Add more images */}
              {(!data.images_url || data.images_url.length < 6) && (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileUpload(e, "gallery")}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="gallery-upload"
                    disabled={isDisabled}
                  />
                  <label
                    htmlFor="gallery-upload"
                    className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg transition-colors ${
                      isDisabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:border-muted-foreground/50"
                    }`}
                  >
                    <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground text-center">
                      {loadingStates.gallery ? "Uploading..." : "Add Image"}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Add up to 6 additional images to showcase your organization
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmRemove}
        title={title}
        description={description}
        confirmText="Remove"
        destructive
      />
    </>
  );
}
