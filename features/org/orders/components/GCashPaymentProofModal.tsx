/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Image from "next/image";
import { ExternalLink, Receipt, Hash } from "lucide-react";
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
  amount: number | null;
  referenceCode: string | null;
};

export function GCashPaymentProofModal({
  isOpen,
  onClose,
  proofUrl,
  amount,
  referenceCode,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>GCash Payment Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-1">
          {/* Proof Image */}
          {proofUrl ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Screenshot Proof</div>
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Image
                  src={proofUrl}
                  alt="GCash Payment Proof"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                  <Badge
                    variant="secondary"
                    className="gap-1.5 backdrop-blur-md bg-white/90 text-black hover:bg-white/90"
                  >
                    View Full Resolution
                    <ExternalLink className="h-3 w-3" />
                  </Badge>
                </div>
              </a>
            </div>
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed bg-muted/50">
              <p className="text-sm text-muted-foreground">
                No image available
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
