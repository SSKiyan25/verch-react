"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ProductImageGalleryProps = {
  featuredUrl: string | null;
  photoUrls: string[];
  productName: string;
};

export function ProductImageGallery({
  featuredUrl,
  photoUrls,
  productName,
}: ProductImageGalleryProps) {
  const allImages = [
    ...(featuredUrl ? [featuredUrl] : []),
    ...photoUrls.filter((url) => url !== featuredUrl),
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  const activeImage = allImages[activeIndex] ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {activeImage ? (
          <Image
            key={activeImage}
            src={activeImage}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            loading="eager"
            className="object-cover transition-opacity duration-300"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((url, idx) => (
            <button
              key={url}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                idx === activeIndex
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
              aria-label={`View image ${idx + 1}`}
            >
              <Image
                src={url}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
                loading="eager"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
