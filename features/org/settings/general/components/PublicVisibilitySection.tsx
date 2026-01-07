"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Globe,
  Lock,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import { Organization } from "@/lib/types/organization";

interface PublicVisibilitySectionProps {
  organization: Organization;
  onUpdate: (data: Partial<Organization>) => Promise<void>;
  isSetupComplete: boolean;
  isLoading?: boolean;
}

export function PublicVisibilitySection({
  organization,
  onUpdate,
  isSetupComplete,
  isLoading = false,
}: PublicVisibilitySectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleVisibilityToggle = async (isPublic: boolean) => {
    if (!isSetupComplete && isPublic) {
      return; // Prevent making public if setup not complete
    }

    setIsUpdating(true);
    try {
      await onUpdate({ is_public: isPublic });
    } catch (error) {
      console.error("Failed to update visibility:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <div
              className={`p-2 rounded-lg ${
                organization.is_public
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              {organization.is_public ? (
                <Globe className="w-5 h-5 text-green-600" />
              ) : (
                <Lock className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="text-center sm:text-left">
              <CardTitle className="flex flex-col items-center sm:flex-row sm:items-center gap-2">
                Public Visibility
                <Badge
                  variant={organization.is_public ? "default" : "secondary"}
                  className="text-xs"
                >
                  {organization.is_public ? "Public" : "Private"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Control whether customers can discover your organization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={organization.is_public}
              onCheckedChange={handleVisibilityToggle}
              disabled={
                (!isSetupComplete && !organization.is_public) ||
                isLoading ||
                isUpdating
              }
              className="data-[state=checked]:bg-green-600"
            />
            <div className="text-sm font-medium">
              {organization.is_public ? (
                <span className="text-green-600">Public</span>
              ) : (
                <span className="text-gray-500">Private</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Information */}
        {organization.is_public ? (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Your organization is publicly visible. Customers can discover and
              interact with your business.
            </AlertDescription>
          </Alert>
        ) : !isSetupComplete ? (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Complete your organization setup to enable public visibility. Your
              organization is currently hidden from customers.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Your organization setup is complete! You can now make it publicly
              visible to customers.
            </AlertDescription>
          </Alert>
        )}

        {/* Visibility Details */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" />
              When Public
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Visible in customer searches</li>
              <li>• Customers can place orders</li>
              <li>• Appears in marketplace listings</li>
              <li>• Accessible via direct link</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              When Private
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Hidden from customer searches</li>
              <li>• No new orders accepted</li>
              <li>• Not shown in marketplace</li>
              <li>• Only admins can access</li>
            </ul>
          </div>
        </div>

        {/* Action Button */}
        {!organization.is_public && isSetupComplete && (
          <div className="pt-2">
            <Button
              onClick={() => handleVisibilityToggle(true)}
              disabled={isLoading || isUpdating}
              className="w-full sm:w-auto"
            >
              <Globe className="w-4 h-4 mr-2" />
              Make Organization Public
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
