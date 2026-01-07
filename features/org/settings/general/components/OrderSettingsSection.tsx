"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Info,
} from "lucide-react";

interface OrderSettingsSectionProps {
  autoAcceptOrders: boolean;
  requireOrderApproval: boolean;
  onUpdate: (settings: {
    autoAcceptOrders: boolean;
    requireOrderApproval: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function OrderSettingsSection({
  autoAcceptOrders,
  requireOrderApproval,
  onUpdate,
  isLoading = false,
  isExpanded,
  onToggle,
}: OrderSettingsSectionProps) {
  const [localSettings, setLocalSettings] = useState({
    autoAcceptOrders,
    requireOrderApproval,
  });

  const handleToggle = (
    field: "autoAcceptOrders" | "requireOrderApproval",
    value: boolean
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    await onUpdate(localSettings);
  };

  const hasChanges =
    localSettings.autoAcceptOrders !== autoAcceptOrders ||
    localSettings.requireOrderApproval !== requireOrderApproval;

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-center sm:text-left">
                  <CardTitle className="text-lg">Order Settings</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure how orders are processed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {autoAcceptOrders ? "Auto Accept" : "Manual Review"}
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
            {/* Auto Accept Orders */}
            <div className="space-y-4">
              <div className="flex flex-col gap-3 p-3 border rounded-lg sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      Auto Accept Orders
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically accept new orders without manual review
                    </p>
                  </div>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <Switch
                    checked={localSettings.autoAcceptOrders}
                    onCheckedChange={(checked) =>
                      handleToggle("autoAcceptOrders", checked)
                    }
                  />
                </div>
              </div>

              {localSettings.autoAcceptOrders && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Orders will be automatically accepted and customers will
                    receive immediate confirmation. Ensure your inventory and
                    capacity can handle the automated flow.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Order Approval Requirement */}
            <div className="space-y-4">
              <div className="flex flex-col gap-3 p-3 border rounded-lg sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      Require Order Approval
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Manually review and approve each order before processing
                    </p>
                  </div>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <Switch
                    checked={localSettings.requireOrderApproval}
                    onCheckedChange={(checked) =>
                      handleToggle("requireOrderApproval", checked)
                    }
                  />
                </div>
              </div>

              {localSettings.requireOrderApproval && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    You&apos;ll need to manually approve each order before
                    it&apos;s processed. This gives you control but may increase
                    response time to customers.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Conflicting Settings Warning */}
            {localSettings.autoAcceptOrders &&
              localSettings.requireOrderApproval && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    <strong>Conflicting Settings:</strong> Auto-accept and
                    manual approval cannot both be enabled. Auto-accept will
                    take priority.
                  </AlertDescription>
                </Alert>
              )}

            {/* Current Flow Summary */}
            <div className="bg-muted/50 p-3 rounded-lg sm:p-4">
              <h4 className="font-medium text-sm mb-3">Current Order Flow:</h4>
              <div className="space-y-2 text-sm">
                {localSettings.autoAcceptOrders ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Orders are automatically accepted upon receipt</span>
                  </div>
                ) : localSettings.requireOrderApproval ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>
                      Orders require manual approval before processing
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Orders are processed with standard workflow</span>
                  </div>
                )}
              </div>
            </div>

            {hasChanges && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? "Saving..." : "Save Order Settings"}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
