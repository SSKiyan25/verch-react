"use client";

import Image from "next/image";
import { ExternalLink, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  proofUrl: string | null;
};

/**
 * Component: PaymentScreenshotPreview
 * 
 * Modal dialog for previewing the uploaded payment screenshot.
 * Shows full-size image with option to view in new tab at original resolution.
 * 
 * Usage:
 * ```tsx
 * <PaymentScreenshotPreview
 *   isOpen={isPreviewOpen}
 *   onClose={() => setIsPreviewOpen(false)}
 *   proofUrl={signedUrl}
 * />
 * ```
 */
export function PaymentScreenshotPreview({
  isOpen,
  onClose,
  proofUrl,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-600" />
            Payment Screenshot Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Screenshot Image */}
          {proofUrl ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                This is the screenshot you uploaded. Click the image to view at full resolution.
              </p>
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Image
                  src={proofUrl}
                  alt="Payment screenshot preview"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                  <Badge variant="secondary" className="gap-1.5 backdrop-blur-md bg-white/90 text-black hover:bg-white/90">
                    View Full Resolution
                    <ExternalLink className="h-3 w-3" />
                  </Badge>
                </div>
              </a>
            </div>
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed bg-muted/50">
              <div className="text-center space-y-2">
                <Eye className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No image available to preview
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
