"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";

export function PaymentProofPreview({ url }: { url: string }) {
  return (
    <Card className="overflow-hidden border-2 border-emerald-200">
      <div className="relative aspect-[3/4] w-full bg-gray-100">
        <Image
          src={url}
          alt="Payment proof preview"
          fill
          className="object-contain"
        />
      </div>
    </Card>
  );
}
