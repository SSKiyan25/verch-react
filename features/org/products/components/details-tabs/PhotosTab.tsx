"use client";

import { useState } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageWithLoading } from "@/components/ui/image-with-loading";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Star,
  Upload,
  Trash2,
  Download,
  ZoomIn,
  Image as ImageIcon,
} from "lucide-react";

interface PhotosTabProps {
  product: ProductWithDetails;
}

export function PhotosTab({ product }: PhotosTabProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const allPhotos = [
    ...(product.featured_photo_url
      ? [{ url: product.featured_photo_url, isFeatured: true }]
      : []),
    ...(product.photo_urls || []).map((url) => ({ url, isFeatured: false })),
  ];

  const handleSetFeatured = (photoUrl: string) => {
    // TODO: Implement set featured photo functionality
    console.log("Set featured:", photoUrl);
  };

  const handleDeletePhoto = (photoUrl: string) => {
    // TODO: Implement delete photo functionality
    console.log("Delete photo:", photoUrl);
  };

  const handleUploadPhoto = () => {
    // TODO: Implement upload photo functionality
    console.log("Upload photo");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Product Photos</h3>
          <p className="text-sm text-muted-foreground">
            Manage your product images and set the featured photo
          </p>
        </div>
        <Button onClick={handleUploadPhoto} size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Upload Photo
        </Button>
      </div>

      {/* Photos Grid */}
      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {allPhotos.map((photo, index) => (
            <Card key={index} className="group relative overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <ImageWithLoading
                    src={photo.url}
                    alt={`${product.name} - Photo ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />

                  {/* Featured Badge */}
                  {photo.isFeatured && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    </div>
                  )}

                  {/* Overlay Actions */}
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
                            <div className="relative aspect-square max-h-[80vh]">
                              <ImageWithLoading
                                src={photo.url}
                                alt={`${product.name} - Full Size`}
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
                </div>

                {/* Photo Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    {!photo.isFeatured && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetFeatured(photo.url)}
                        className="flex-1 text-xs"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Set Featured
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePhoto(photo.url)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={photo.isFeatured && allPhotos.length === 1}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {photo.isFeatured && allPhotos.length === 1 && (
                    <p className="text-xs text-muted-foreground">
                      Cannot delete the only product photo
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No photos uploaded
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Upload photos to showcase your product. The first photo will be
              set as the featured image.
            </p>
            <Button onClick={handleUploadPhoto}>
              <Upload className="w-4 h-4 mr-2" />
              Upload First Photo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Photo Guidelines */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">Photo Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use high-quality images (at least 1000x1000 pixels)</li>
            <li>• Upload multiple angles to showcase your product</li>
            <li>• The featured photo will be shown on product cards</li>
            <li>• Supported formats: JPG, PNG, WebP</li>
            <li>• Maximum file size: 5MB per image</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
