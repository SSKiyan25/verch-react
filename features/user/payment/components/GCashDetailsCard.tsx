"use client";

import { Smartphone, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type GCashSettings = {
  number: string;
  accountName: string;
  qrImagePath: string | null;
};

export function GCashDetailsCard({
  settings,
  isLoading,
}: {
  settings: GCashSettings | null;
  isLoading: boolean;
}) {
  const supabase = createClient();
  // console.log(
  //   "[GCashDetailsCard] settings:",
  //   settings,
  //   "isLoading:",
  //   isLoading,
  // );
  if (isLoading) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <Smartphone className="h-5 w-5" />
            GCash Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="mx-auto h-64 w-64 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-8 text-center text-orange-900">
          <p className="text-sm font-medium">
            GCash details are not configured for this organization.
          </p>
          <p className="mt-2 text-xs text-orange-700">
            Please contact the organization for assistance.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get QR code URL from org-gcash-qr bucket (where it's actually stored)
  const qrUrl = settings.qrImagePath
    ? supabase.storage.from("org-gcash-qr").getPublicUrl(settings.qrImagePath)
        .data.publicUrl
    : null;

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <Smartphone className="h-5 w-5" />
          GCash Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* GCash Number */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-emerald-700">GCash Number</p>
          <p className="text-2xl font-bold tracking-wide text-emerald-900">
            {settings.number}
          </p>
        </div>

        {/* Account Name */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-emerald-700">Account Name</p>
          <p className="flex items-center gap-2 text-lg font-semibold text-emerald-900">
            <User className="h-4 w-4" />
            {settings.accountName}
          </p>
        </div>

        {/* QR Code */}
        {qrUrl && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-700">Scan QR Code</p>
            <div className="flex justify-center rounded-lg bg-white p-4 shadow-md">
              <Image
                src={qrUrl}
                alt="GCash QR Code"
                width={256}
                height={256}
                className="rounded-md"
                priority
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-900">
            Transfer the exact order amount to this GCash account, then upload
            your payment proof below.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
