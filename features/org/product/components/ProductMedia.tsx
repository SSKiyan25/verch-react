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

  const { uploadToTemporary, uploadMultipleToTemporary, isUploading } =
    useImageUpload({
      tempBucket: "temp-uploads",
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
    });

  const handleFileSelect = async (
    files: FileList | null,
    isFeatured = false,
  ) => {
    if (!files || files.length === 0) return;

    try {
      if (isFeatured) {
        // Upload single featured image to temp
        const file = files[0];
        const result = await uploadToTemporary(file, "products", "featured");

        // Validate before updating (using temp URL for validation)
        const isValid = validateFeaturedPhoto(result.url);
        if (isValid) {
          onChange({ temp_featured_image_path: result.path });
          toast.success("Featured image uploaded successfully!");
        }
      } else {
        // Upload multiple images to temp
        const filesArray = Array.from(files);
        const results = await uploadMultipleToTemporary(filesArray, "products");
        const tempPaths = results.map((r) => r.path);
        const tempUrls = results.map((r) => r.url);
        const updatedTempPaths = [
          ...(data.temp_gallery_image_paths || []),
          ...tempPaths,
        ];

        // Validate before updating (using temp URLs for validation)
        const isValid = validatePhotos(tempUrls);
        if (isValid) {
          onChange({ temp_gallery_image_paths: updatedTempPaths });
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

  const removePhoto = (path: string) => {
    const newTempPaths =
      data.temp_gallery_image_paths?.filter((p) => p !== path) || [];

    // Validate before updating
    validatePhotos(newTempPaths); // Adjust validation if needed for paths
    onChange({ temp_gallery_image_paths: newTempPaths });

    // If removing featured photo, clear it
    if (data.temp_featured_image_path === path) {
      validateFeaturedPhoto("");
      onChange({ temp_featured_image_path: "" });
    }
  };

  const setFeaturedPhoto = (path: string) => {
    // Validate before updating
    const isValid = validateFeaturedPhoto(path); // Adjust if needed
    if (isValid) {
      onChange({ temp_featured_image_path: path });
      toast.success("Featured image updated!");
    }
  };

  const canUploadMore =
    !data.temp_gallery_image_paths || data.temp_gallery_image_paths.length < 10;

  // Helper to get temp URL for preview
  const getTempUrl = (path: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/temp-uploads/${path}`;
  };

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
              Featured Image <span className="text-red-500">*</span>
              {(errors.featured_photo_url ||
                errors.temp_featured_image_path) && (
                <span className="text-xs text-red-500 ml-2">
                  (
                  {errors.featured_photo_url || errors.temp_featured_image_path}
                  )
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

          {data.temp_featured_image_path ? (
            <div className="space-y-2">
              <div className="relative w-full h-96 rounded-lg overflow-hidden border">
                <ImageWithLoading
                  src={getTempUrl(data.temp_featured_image_path)}
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
                    onChange({ temp_featured_image_path: "" });
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

          {(errors.featured_photo_url || errors.temp_featured_image_path) && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {errors.featured_photo_url || errors.temp_featured_image_path}
            </div>
          )}
        </div>

        {/* Additional Photos Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Additional Photos
              {data.temp_gallery_image_paths && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({data.temp_gallery_image_paths.length}/10)
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
          {data.temp_gallery_image_paths &&
          data.temp_gallery_image_paths.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.temp_gallery_image_paths.map((path, index) => (
                <div key={index} className="relative group">
                  <div className="relative aspect-square rounded-lg overflow-hidden border">
                    <ImageWithLoading
                      src={getTempUrl(path)}
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
                        onClick={() => setFeaturedPhoto(path)}
                        disabled={data.temp_featured_image_path === path}
                        title="Set as featured"
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePhoto(path)}
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Featured indicator */}
                    {data.temp_featured_image_path === path && (
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
