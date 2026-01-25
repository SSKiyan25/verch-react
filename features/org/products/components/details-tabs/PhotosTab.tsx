"use client";

import { useRef } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageWithLoading } from "@/components/ui/image-with-loading";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Star,
  Upload,
  Trash2,
  Download,
  ZoomIn,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { usePhotosTabController } from "../../hooks/usePhotosTabController";

interface PhotosTabProps {
  product: ProductWithDetails;
  onProductUpdate?: (product: ProductWithDetails) => void;
}

export function PhotosTab(props: PhotosTabProps) {
  const { state, handlers } = usePhotosTabController(props);

  // 1. DEFINE REF HERE (View Layer)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. DEFINE TRIGGER HERE
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 3. CONNECT INPUT TO HOOK
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handlers.handleFileSelect(files);
    }
  };

  // Loading State
  if (state.isInitializing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (!state.hasOrganization) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Organization not found. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden Input with local Ref */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFileInputChange}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Product Photos</h3>
          <p className="text-sm text-muted-foreground">
            Manage your product images and set the featured photo
          </p>
        </div>
        <Button
          onClick={handleUploadClick}
          size="sm"
          disabled={state.isLoading}
        >
          {state.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </>
          )}
        </Button>
      </div>

      {state.uploadProgress > 0 && state.uploadProgress < 100 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading photos...</span>
            <span>{state.uploadProgress}%</span>
          </div>
          <Progress value={state.uploadProgress} className="w-full" />
        </div>
      )}

      {state.allPhotos.length > 0 ? (
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ${
            state.dragActive
              ? "border-2 border-dashed border-blue-500 bg-blue-50 rounded-lg p-4"
              : ""
          }`}
          onDragEnter={handlers.handleDrag}
          onDragLeave={handlers.handleDrag}
          onDragOver={handlers.handleDrag}
          onDrop={handlers.handleDrop}
        >
          {state.allPhotos.map((photo, index) => (
            <Card key={photo.url} className="group relative overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  {photo.isUploading ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2 mx-auto" />
                        <p className="text-xs text-muted-foreground">
                          Uploading...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ImageWithLoading
                      src={photo.url}
                      alt={`${state.localProduct.name} - Photo ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {photo.isFeatured && !photo.isUploading && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    </div>
                  )}

                  {state.isLoading && !photo.isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}

                  {!photo.isUploading && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="bg-white/90 text-gray-900 hover:bg-white"
                              >
                                <ZoomIn className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>
                                  <span className="sr-only">Product Image</span>
                                </DialogTitle>
                              </DialogHeader>
                              <div className="relative aspect-square max-h-[80vh]">
                                <ImageWithLoading
                                  src={photo.url}
                                  alt="Full Size"
                                  width={800}
                                  height={800}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/90 text-gray-900 hover:bg-white"
                            asChild
                          >
                            <a
                              href={photo.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!photo.isUploading && (
                  <div className="p-3 space-y-2">
                    <div className="flex gap-2">
                      {!photo.isFeatured && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlers.handleSetFeatured(photo.url)}
                          className="flex-1 text-xs"
                          disabled={state.isLoading}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Set Featured
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handlers.handleDeletePhoto(
                            photo.url,
                            photo.isFeatured
                          )
                        }
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={
                          state.isLoading ||
                          (photo.isFeatured &&
                            state.allPhotos.filter((p) => !p.isUploading)
                              .length === 1)
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card
          className={`border-dashed border-2 ${
            state.dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-muted-foreground/25"
          } transition-colors cursor-pointer`}
          onDragEnter={handlers.handleDrag}
          onDragLeave={handlers.handleDrag}
          onDragOver={handlers.handleDrag}
          onDrop={handlers.handleDrop}
          onClick={handleUploadClick}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon
              className={`w-12 h-12 mb-4 ${
                state.dragActive ? "text-blue-500" : "text-muted-foreground/50"
              }`}
            />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {state.dragActive ? "Drop images here" : "No photos uploaded"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              {state.dragActive
                ? "Release to upload the images"
                : "Upload photos to showcase your product. You can drag & drop or click to browse."}
            </p>
            {!state.dragActive && (
              <Button onClick={handleUploadClick} disabled={state.isLoading}>
                {state.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload First Photo
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">Photo Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use high-quality images (at least 1000x1000 pixels)</li>
            <li>• Upload multiple angles to showcase your product</li>
            <li>• The featured photo will be shown on product cards</li>
            <li>• Supported formats: JPG, PNG, WebP</li>
            <li>• Maximum file size: 2MB per image</li>
            <li>• You can drag & drop multiple images at once</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
