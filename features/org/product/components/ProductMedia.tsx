"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageWithLoading } from "@/components/ui/image-with-loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  X,
  Star,
  Image as ImageIcon,
  Loader2,
  Info,
  AlertCircle,
} from "lucide-react";
import { CreateProductData } from "@/lib/types/product";
import { useRef } from "react";
import { useImageUpload } from "@/lib/hooks/use-image-upload";
import { toast } from "sonner";
import { useProductValidation } from "../hooks/useProductValidation";

interface ProductMediaProps {
  data: CreateProductData;
  onChange: (updates: Partial<CreateProductData>) => void;
}

export function ProductMedia({ data, onChange }: ProductMediaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { errors, validatePhotos, validateFeaturedPhoto } =
    useProductValidation(data);

  const { uploadImage, uploadMultipleImages, isUploading } = useImageUpload({
    bucket: "product-images",
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
  });

  const handleFileSelect = async (
    files: FileList | null,
    isFeatured = false
  ) => {
    if (!files || files.length === 0) return;

    try {
      if (isFeatured) {
        // Upload single featured image
        const file = files[0];
        const result = await uploadImage(file, "products");
        const newFeaturedUrl = result.url;

        // Validate before updating
        const isValid = validateFeaturedPhoto(newFeaturedUrl);
        if (isValid) {
          onChange({ featured_photo_url: newFeaturedUrl });
          toast.success("Featured image uploaded successfully!");
        }
      } else {
        // Upload multiple images
        const filesArray = Array.from(files);
        const results = await uploadMultipleImages(filesArray, "products");
        const newUrls = results.map((r) => r.url);
        const updatedUrls = [...(data.photo_urls || []), ...newUrls];

        // Validate before updating
        const isValid = validatePhotos(updatedUrls);
        if (isValid) {
          onChange({ photo_urls: updatedUrls });
          toast.success(`${filesArray.length} image(s) uploaded successfully!`);
        } else {
          toast.error(errors.photo_urls || "Invalid images");
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      // Error toast is already handled by the hook
    }
  };

  const removePhoto = (url: string) => {
    const newPhotos = data.photo_urls?.filter((u) => u !== url) || [];

    // Validate before updating
    validatePhotos(newPhotos);
    onChange({ photo_urls: newPhotos });

    // If removing featured photo, clear it
    if (data.featured_photo_url === url) {
      validateFeaturedPhoto("");
      onChange({ featured_photo_url: "" });
    }
  };

  const setFeaturedPhoto = (url: string) => {
    // Validate before updating
    const isValid = validateFeaturedPhoto(url);
    if (isValid) {
      onChange({ featured_photo_url: url });
      toast.success("Featured image updated!");
    }
  };

  const canUploadMore = !data.photo_urls || data.photo_urls.length < 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Product Images
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            Upload high-quality images to showcase your product. The first image
            will be used as the featured image. Supported formats: JPG, PNG,
            WebP (max 5MB each). Maximum 10 images total.
            {errors.photo_urls && (
              <span className="text-red-500 ml-2">({errors.photo_urls})</span>
            )}
          </AlertDescription>
        </Alert>

        {/* Featured Image Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Featured Image
              {errors.featured_photo_url && (
                <span className="text-xs text-red-500 ml-2">
                  ({errors.featured_photo_url})
                </span>
              )}
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Featured
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files, true)}
          />

          {data.featured_photo_url ? (
            <div className="space-y-2">
              <div className="relative w-full h-96 rounded-lg overflow-hidden border">
                <ImageWithLoading
                  src={data.featured_photo_url}
                  alt="Featured image"
                  width={600}
                  height={1200}
                  className="w-full h-full object-contain"
                />
                <Badge className="absolute top-2 left-2">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    validateFeaturedPhoto("");
                    onChange({ featured_photo_url: "" });
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                errors.featured_photo_url
                  ? "border-red-300 hover:border-red-400"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload featured image
              </p>
            </div>
          )}

          {errors.featured_photo_url && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {errors.featured_photo_url}
            </div>
          )}
        </div>

        {/* Additional Photos Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Additional Photos
              {data.photo_urls && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({data.photo_urls.length}/10)
                </span>
              )}
              {errors.photo_urls && (
                <span className="text-xs text-red-500 ml-2">
                  ({errors.photo_urls})
                </span>
              )}
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.accept = "image/*";
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  handleFileSelect(files, false);
                };
                input.click();
              }}
              disabled={isUploading || !canUploadMore}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Photos
            </Button>
          </div>

          {errors.photo_urls && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {errors.photo_urls}
            </div>
          )}

          {/* Photo Gallery */}
          {data.photo_urls && data.photo_urls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.photo_urls.map((url, index) => (
                <div key={index} className="relative group">
                  <div className="relative aspect-square rounded-lg overflow-hidden border">
                    <ImageWithLoading
                      src={url}
                      alt={`Product image ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay buttons */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setFeaturedPhoto(url)}
                        disabled={data.featured_photo_url === url}
                        title="Set as featured"
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePhoto(url)}
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Featured indicator */}
                    {data.featured_photo_url === url && (
                      <Badge className="absolute top-1 left-1 text-xs">
                        <Star className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No additional photos yet
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    handleFileSelect(files, false);
                  };
                  input.click();
                }}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photos
              </Button>
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {isUploading && (
          <Alert>
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription>
              Uploading images... Please wait.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
