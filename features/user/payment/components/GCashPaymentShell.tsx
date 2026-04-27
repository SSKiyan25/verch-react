"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Upload,
  CreditCard,
  Hash,
  PhilippinePeso,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadPaymentProofAction } from "@/features/user/checkout/actions/uploadPaymentProofAction";
import { submitPaymentProofAction } from "@/features/user/orders/actions/submitPaymentProofAction";
import { deleteStorageFileAction } from "@/features/user/orders/actions/deleteStorageFileAction";
import { useGCashSettings } from "@/features/user/payment/hooks/useGCashSettings";
import { GCashDetailsCard } from "./GCashDetailsCard";
import { PaymentProofPreview } from "./PaymentProofPreview";
import type { OrderDetail } from "@/lib/supabase/queries/orders";
// Note: Will be deleted after testing - only used for debugging file uploads
import { debugUploadAction } from "@/features/user/checkout/actions/debugUploadAction";

export function GCashPaymentShell({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const { gcashSettings, isLoading: isLoadingSettings } = useGCashSettings(
    order.organization_id,
  );

  // console.log("[GCashPaymentShell] order:", order);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [referenceCode, setReferenceCode] = useState("");

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    console.log("[handleUpload] selectedFile:", selectedFile);
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("orderId", order.order_id);
    formData.append("file", selectedFile);

    const debug = await debugUploadAction(formData);
    console.log("[handleUpload] debug result:", debug);

    const result = await uploadPaymentProofAction(formData);

    setIsUploading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setUploadedPath(result.path);
    setUploadedUrl(result.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedPath || !uploadedUrl) {
      setError("Please upload a payment screenshot first");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!referenceCode.trim()) {
      setError("Please enter a reference code");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await submitPaymentProofAction({
      orderId: order.order_id,
      proofPath: uploadedPath,
      proofUrl: uploadedUrl,
      proofAmount: parsedAmount,
      proofReferenceCode: referenceCode.trim(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Success! Redirect to order detail
    router.push(`/user/orders/${order.order_id}`);
  };

  const handleRemoveFile = async () => {
    if (uploadedPath) {
      // Clean up uploaded file
      await deleteStorageFileAction(uploadedPath);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedPath(null);
    setUploadedUrl(null);
  };

  const canSubmit =
    gcashSettings &&
    uploadedPath &&
    uploadedUrl &&
    amount &&
    referenceCode.trim() &&
    !isSubmitting &&
    !isUploading;

  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bol  d tracking-tight text-gray-900">
          Complete Your Payment
        </h1>
        <p className="text-sm text-gray-600">
          Order #{order.order_number} • {order.org_name}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: GCash Details */}
        <div>
          <GCashDetailsCard
            settings={gcashSettings}
            isLoading={isLoadingSettings}
          />
        </div>

        {!isLoadingSettings && !gcashSettings && (
          <Alert className="mb-4 border-orange-200 bg-orange-50 text-orange-800">
            <AlertDescription>
              This organization hasn&apos;t configured GCash yet. Payment
              submission is unavailable.
            </AlertDescription>
          </Alert>
        )}

        {/* Right: Payment Proof Upload */}
        <div>
          <Card
            className={`border-2 shadow-md ${!isLoadingSettings && !gcashSettings ? "border-gray-200 opacity-60" : "border-emerald-200"}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <Upload className="h-5 w-5" />
                Submit Payment Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Upload */}
                <div className="space-y-3">
                  <Label htmlFor="proof-file" className="text-sm font-semibold">
                    Payment Screenshot
                  </Label>
                  {!uploadedPath ? (
                    <div className="space-y-3">
                      <Input
                        id="proof-file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                      {previewUrl && (
                        <div className="space-y-2">
                          <PaymentProofPreview url={previewUrl} />
                          <Button
                            type="button"
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Screenshot
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <PaymentProofPreview url={previewUrl!} />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveFile}
                        className="w-full"
                      >
                        Remove & Upload Different File
                      </Button>
                    </div>
                  )}
                </div>

                {/* Amount Paid */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-semibold">
                    Amount Paid (₱)
                  </Label>
                  <div className="relative">
                    <PhilippinePeso className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`Order total: ₱${order.total_amount.toFixed(2)}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={isSubmitting || !uploadedPath}
                      className="pl-9"
                    />
                  </div>
                  {amount &&
                    parseFloat(amount) !== order.total_amount &&
                    parseFloat(amount) > 0 && (
                      <p className="text-xs text-orange-600">
                        ⚠️ Amount differs from order total (₱
                        {order.total_amount.toFixed(2)})
                      </p>
                    )}
                </div>

                {/* Reference Code */}
                <div className="space-y-2">
                  <Label htmlFor="reference" className="text-sm font-semibold">
                    Reference Code
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="reference"
                      type="text"
                      placeholder="e.g., GCASH-123456789"
                      value={referenceCode}
                      onChange={(e) => setReferenceCode(e.target.value)}
                      disabled={isSubmitting || !uploadedPath}
                      className="pl-9 font-mono"
                      maxLength={100}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    Enter the transaction reference number from your GCash
                    receipt
                  </p>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-lg font-semibold shadow-lg transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl disabled:opacity-50"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting Payment Proof...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Submit Payment Proof
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
