"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Smartphone, ChevronDown, ChevronUp, X, Upload } from "lucide-react";
import { useGCashSettings } from "@/features/org/settings/general/hooks/useGCashSettings";
import Image from "next/image";

type GCashSettingsSectionProps = {
  orgId: string;
  initialGcash?: {
    number?: string;
    accountName?: string;
    qrImagePath?: string | null;
  } | null;
  isExpanded: boolean;
  onToggle: () => void;
};

export function GCashSettingsSection({
  orgId,
  initialGcash,
  isExpanded,
  onToggle,
}: GCashSettingsSectionProps) {
  const {
    number,
    setNumber,
    accountName,
    setAccountName,
    qrPreviewUrl,
    handleQrFileSelect,
    handleRemoveQr,
    handleSave,
    isUploading,
    isSaving,
    hasChanges,
  } = useGCashSettings({ orgId, initialGcash });

  const [fileInputKey, setFileInputKey] = useState(0);

  const isConfigured = !!(initialGcash?.number && initialGcash?.accountName);

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-center sm:text-left">
                  <CardTitle className="text-lg">
                    GCash Payment Details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Customers will see these details when paying via GCash
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={isConfigured ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isConfigured ? "Configured" : "Not Set"}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* GCash Number */}
            <div className="space-y-2">
              <Label htmlFor="gcash-number">
                GCash Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gcash-number"
                type="tel"
                placeholder="09XX-XXX-XXXX or +639XXXXXXXXX"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                disabled={isSaving || isUploading}
              />
              <p className="text-xs text-muted-foreground">
                Enter your GCash mobile number (Philippine format)
              </p>
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="gcash-account-name">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gcash-account-name"
                type="text"
                placeholder="As shown in GCash app"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={isSaving || isUploading}
              />
              <p className="text-xs text-muted-foreground">
                Enter the account name exactly as it appears in your GCash app
              </p>
            </div>

            {/* QR Code Upload */}
            <div className="space-y-2">
              <Label>QR Code (Optional)</Label>
              {qrPreviewUrl ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <Image
                      src={qrPreviewUrl}
                      alt="GCash QR code"
                      width={200}
                      height={200}
                      className="rounded-lg border"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleRemoveQr();
                      setFileInputKey((prev) => prev + 1);
                    }}
                    disabled={isUploading || isSaving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove QR Code
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Upload QR Code</p>
                    <p className="text-xs text-muted-foreground">
                      Upload a QR code image from your GCash app
                    </p>
                  </div>
                  <Input
                    key={fileInputKey}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleQrFileSelect(file);
                    }}
                    disabled={isUploading || isSaving}
                    className="max-w-xs mx-auto"
                  />
                </div>
              )}
              {isUploading && (
                <p className="text-sm text-muted-foreground">Uploading...</p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={isSaving || isUploading || !hasChanges}
              >
                {isSaving ? "Saving..." : "Save GCash Settings"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
