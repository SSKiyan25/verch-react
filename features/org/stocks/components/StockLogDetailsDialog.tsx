"use client";

import { useState, useEffect } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import type { StockLogEntry } from "@/lib/types/org-products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  User,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Database,
  Hash,
  Loader2,
} from "lucide-react";
import { getVariationDisplayName } from "@/lib/utils/product-utils";
import { createClient } from "@/lib/supabase/client";

interface StockLogDetailsDialogProps {
  log: StockLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithDetails;
}

interface UserInfo {
  full_name: string;
  role: string;
  avatar_url?: string | null;
}

export function StockLogDetailsDialog({
  log,
  open,
  onOpenChange,
  product,
}: StockLogDetailsDialogProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!log?.performed_by || !open) {
        setUserInfo(null);
        return;
      }

      setLoadingUser(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("users")
          .select("full_name, role, avatar_url")
          .eq("id", log.performed_by)
          .single();

        if (!error && data) {
          setUserInfo(data);
        } else {
          setUserInfo(null);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setUserInfo(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserInfo();
  }, [log?.performed_by, open]);

  if (!log) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionIcon = (action: string) => {
    const isIncrease = ["increase", "adjustment", "released"].includes(action);
    return isIncrease ? (
      <TrendingUp className="w-5 h-5 text-green-600" />
    ) : (
      <TrendingDown className="w-5 h-5 text-red-600" />
    );
  };

  const getActionColor = (action: string) => {
    const isIncrease = ["increase", "adjustment", "released"].includes(action);
    return isIncrease ? "text-green-600" : "text-red-600";
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "increase":
        return "Stock Addition";
      case "decrease":
        return "Stock Removal";
      case "adjustment":
        return "Stock Adjustment";
      case "reserved":
        return "Stock Reserved";
      case "released":
        return "Stock Released";
      default:
        return "Stock Change";
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: "Admin",
      organization_admin: "Organization Admin",
      organization_manager: "Manager",
      organization_staff: "Staff",
      customer: "Customer",
    };
    return roleMap[role] || role;
  };

  const variation = product.variations?.find((v) => v.id === log.variation_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            Stock Log Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {getActionIcon(log.action)}
                {getActionLabel(log.action)}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Previous Quantity
                </div>
                <div className="text-lg font-semibold">
                  {log.previous_quantity ?? 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  New Quantity
                </div>
                <div className="text-lg font-semibold">
                  {log.new_quantity ?? 0}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">
                  Quantity Change
                </div>
                <div
                  className={`text-xl font-bold ${getActionColor(log.action)}`}
                >
                  {log.quantity_change > 0 ? "+" : ""}
                  {log.quantity_change}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variation Details */}
          {variation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4" />
                  Variation Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Variation Name
                  </div>
                  <div className="font-medium">
                    {getVariationDisplayName(variation)}
                  </div>
                </div>
                {variation.sku && (
                  <div>
                    <div className="text-sm text-muted-foreground">SKU</div>
                    <Badge variant="outline">{variation.sku}</Badge>
                  </div>
                )}
                <div>
                  <div className="text-sm text-muted-foreground">
                    Current Price
                  </div>
                  <div className="font-medium">
                    ₱{variation.price.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="w-4 h-4" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    Created At
                  </div>
                  <div className="font-medium">
                    {formatDate(log.created_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1">
                    Performed By
                  </div>
                  {loadingUser ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading user...
                    </div>
                  ) : log.performed_by && userInfo ? (
                    <div className="space-y-1">
                      <div className="font-medium">{userInfo.full_name}</div>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(userInfo.role)}
                      </Badge>
                    </div>
                  ) : (
                    <div className="font-medium text-muted-foreground">
                      System
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Log ID</div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    #{log.id}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          {log.remarks && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  Remarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm bg-muted/50 p-3 rounded-lg">
                  {log.remarks}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
