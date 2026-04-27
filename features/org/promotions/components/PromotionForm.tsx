"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchOrgProducts } from "@/lib/supabase/queries/org-products";
import type { OrgProductListItem } from "@/lib/types/org-products";
import { usePromotionForm } from "../hooks/usePromotionForm";
import { ProductSelector } from "./ProductSelector";
import type {
  CreatePromotionInput,
  promotionTriggerTypeSchema,
  promotionDiscountTypeSchema,
  promotionTargetTypeSchema,
} from "../schemas/promotionSchemas";
import type {
  OrgPromotionDetail,
  EligibilityRuleType,
} from "@/lib/types/org-promotions";

type PromotionFormProps = {
  orgId: string;
  mode: "create" | "edit";
  initialData?: OrgPromotionDetail;
};

// Helper: Convert datetime-local string to ISO datetime string
function datetimeLocalToISO(datetimeLocal: string | null): string | null {
  if (!datetimeLocal) return null;
  // datetime-local returns "YYYY-MM-DDTHH:MM"
  // We need to convert it to ISO 8601 format "YYYY-MM-DDTHH:MM:SS.SSSZ"
  try {
    const date = new Date(datetimeLocal);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

// Helper: Convert ISO datetime string to datetime-local format
function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    // datetime-local expects "YYYY-MM-DDTHH:MM"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

type SimpleProduct = {
  id: string;
  name: string;
  status: string;
};

// Constant empty metadata object to prevent creating new instances on every render
const EMPTY_METADATA: Record<string, unknown> = {};

// ---------------------------------------------------------------------------
// SegmentedControl Options — Define outside component for stable references
// ---------------------------------------------------------------------------

const TRIGGER_TYPE_OPTIONS: SegmentedControlOption<"auto" | "voucher_code">[] =
  [
    { value: "auto", label: "Auto" },
    { value: "voucher_code", label: "Voucher Code" },
  ];

const DISCOUNT_TYPE_OPTIONS: SegmentedControlOption<
  "percentage" | "fixed" | "free_item"
>[] = [
  { value: "percentage", label: "Percentage (% off)" },
  { value: "fixed", label: "Fixed (₱ off)" },
  { value: "free_item", label: "Free Item" },
];

const TARGET_TYPE_OPTIONS: SegmentedControlOption<
  "order" | "product" | "organization"
>[] = [
  { value: "order", label: "Entire Order" },
  { value: "product", label: "Specific Products" },
  { value: "organization", label: "All Org Products" },
];

export function PromotionForm({
  orgId,
  mode,
  initialData,
}: PromotionFormProps) {
  const {
    handleSubmit: submitToAction,
    isPending,
    error,
  } = usePromotionForm({
    orgId,
    promotionId: initialData?.id,
    mode,
  });

  // Products state for target selection
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Form state - use CreatePromotionInput for both create and edit modes
  // since we initialize all fields consistently
  const [formData, setFormData] = useState<CreatePromotionInput>(
    mode === "create"
      ? {
          name: "",
          description: null,
          trigger_type: "auto",
          voucher_code: null,
          target_type: "order",
          discount_type: "percentage",
          discount_value: null,
          minimum_order_amount: 0,
          total_uses_cap: null,
          starts_at: null,
          ends_at: null,
          target_product_ids: null,
          gift_variation_id: null,
          gift_quantity: 1,
          eligibility_rules: [],
        }
      : {
          name: initialData?.name || "",
          description: initialData?.description || null,
          trigger_type: initialData?.trigger_type || "auto",
          voucher_code: initialData?.voucher_code || null,
          target_type: initialData?.target_type || "order",
          discount_type: initialData?.discount_type || "percentage",
          discount_value: initialData?.discount_value ?? null,
          minimum_order_amount: initialData?.minimum_order_amount || 0,
          total_uses_cap: initialData?.total_uses_cap ?? null,
          starts_at: initialData?.starts_at ?? null,
          ends_at: initialData?.ends_at ?? null,
          target_product_ids:
            initialData?.targets
              ?.filter((t) => t.product_id !== null)
              .map((t) => t.product_id!)
              .filter((id) => id !== null) ?? null,
          gift_variation_id: initialData?.gift_item?.variation_id ?? null,
          gift_quantity: initialData?.gift_item?.quantity ?? 1,
          eligibility_rules: initialData?.eligibility_rules ?? [],
        },
  );

  // Fetch products when component mounts using RPC
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.error("No authenticated user");
          return;
        }

        const result = await fetchOrgProducts(
          supabase,
          user.id,
          orgId,
          { status: "published", isArchived: false },
          1,
          1000,
        );

        // Map to simple product shape
        const simpleProducts = result.items.map((p: OrgProductListItem) => ({
          id: p.id,
          name: p.name,
          status: p.status,
        }));
        setProducts(simpleProducts);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [orgId]);

  // Memoize all field-specific handlers to prevent creating new functions on every render
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, name: e.target.value }));
    },
    [],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, description: e.target.value || null }));
    },
    [],
  );

  const handleTriggerTypeChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      trigger_type: value as z.infer<typeof promotionTriggerTypeSchema>,
    }));
  }, []);

  const handleVoucherCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        voucher_code: e.target.value.toUpperCase() || null,
      }));
    },
    [],
  );

  const handleDiscountTypeChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      discount_type: value as z.infer<typeof promotionDiscountTypeSchema>,
    }));
  }, []);

  const handleDiscountValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        discount_value: e.target.value ? parseFloat(e.target.value) : null,
      }));
    },
    [],
  );

  const handleTargetTypeChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      target_type: value as z.infer<typeof promotionTargetTypeSchema>,
    }));
  }, []);

  const handleMinimumOrderAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        minimum_order_amount: e.target.value ? parseFloat(e.target.value) : 0,
      }));
    },
    [],
  );

  const handleTotalUsesCapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        total_uses_cap: e.target.value ? parseInt(e.target.value) : null,
      }));
    },
    [],
  );

  const handleStartsAtChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        starts_at: datetimeLocalToISO(e.target.value),
      }));
    },
    [],
  );

  const handleEndsAtChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        ends_at: datetimeLocalToISO(e.target.value),
      }));
    },
    [],
  );

  // Memoize selected product IDs to prevent unnecessary re-renders
  const selectedProductIds = useMemo(() => {
    return (formData.target_product_ids as string[] | null) || [];
  }, [formData.target_product_ids]);

  // Memoize product selection handler to prevent recreating callback on every render
  const handleProductSelectionChange = useCallback((selectedIds: string[]) => {
    setFormData((prev) => ({ ...prev, target_product_ids: selectedIds }));
  }, []);

  // Memoize eligibility rules checked state
  const isVerifiedStudentChecked = useMemo(() => {
    return formData.eligibility_rules.some(
      (r) => r.rule_type === "verified_student",
    );
  }, [formData.eligibility_rules]);

  const isActiveMemberChecked = useMemo(() => {
    return formData.eligibility_rules.some(
      (r) => r.rule_type === "active_member",
    );
  }, [formData.eligibility_rules]);

  // Memoize eligibility rule handlers
  const handleVerifiedStudentChange = useCallback((checked: boolean) => {
    setFormData((prev) => {
      const current = prev.eligibility_rules;
      if (checked) {
        return {
          ...prev,
          eligibility_rules: [
            ...current,
            {
              rule_type: "verified_student" as EligibilityRuleType,
              metadata: EMPTY_METADATA,
            },
          ],
        };
      } else {
        return {
          ...prev,
          eligibility_rules: current.filter(
            (r) => r.rule_type !== "verified_student",
          ),
        };
      }
    });
  }, []);

  const handleActiveMemberChange = useCallback((checked: boolean) => {
    setFormData((prev) => {
      const current = prev.eligibility_rules;
      if (checked) {
        return {
          ...prev,
          eligibility_rules: [
            ...current,
            {
              rule_type: "active_member" as EligibilityRuleType,
              metadata: EMPTY_METADATA,
            },
          ],
        };
      } else {
        return {
          ...prev,
          eligibility_rules: current.filter(
            (r) => r.rule_type !== "active_member",
          ),
        };
      }
    });
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitToAction(formData as CreatePromotionInput);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Back Button */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/org/promotions">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Promotions
          </Link>
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Promotion Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={handleNameChange}
              placeholder="e.g., Summer Sale 20% Off"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={handleDescriptionChange}
              placeholder="Optional description of this promotion..."
              rows={3}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger Type & Voucher Code */}
      <Card>
        <CardHeader>
          <CardTitle>How Customers Apply This Promotion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trigger_type">
              Trigger Type <span className="text-destructive">*</span>
            </Label>
            <SegmentedControl
              options={TRIGGER_TYPE_OPTIONS}
              value={formData.trigger_type}
              onValueChange={handleTriggerTypeChange}
              disabled={isPending || mode === "edit"}
              className="w-full sm:w-auto"
            />
            <p className="text-xs text-muted-foreground">
              {mode === "edit"
                ? "Trigger type cannot be changed after creation"
                : formData.trigger_type === "auto"
                  ? "Promotion applies automatically at checkout"
                  : "Customer must enter a code to apply"}
            </p>
          </div>

          {formData.trigger_type === "voucher_code" && (
            <div className="space-y-2">
              <Label htmlFor="voucher_code">
                Voucher Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="voucher_code"
                value={formData.voucher_code || ""}
                onChange={handleVoucherCodeChange}
                placeholder="e.g., SUMMER2026"
                disabled={isPending}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Code will be converted to uppercase
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discount_type">
              Discount Type <span className="text-destructive">*</span>
            </Label>
            <SegmentedControl
              options={DISCOUNT_TYPE_OPTIONS}
              value={formData.discount_type}
              onValueChange={handleDiscountTypeChange}
              disabled={isPending || mode === "edit"}
              className="w-full sm:w-auto"
            />
            {mode === "edit" && (
              <p className="text-xs text-muted-foreground">
                Discount type cannot be changed after creation
              </p>
            )}
          </div>

          {(formData.discount_type === "percentage" ||
            formData.discount_type === "fixed") && (
            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {formData.discount_type === "percentage"
                  ? "Percentage Off (0-100)"
                  : "Amount Off (₱)"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="discount_value"
                type="number"
                step={formData.discount_type === "percentage" ? "1" : "0.01"}
                value={formData.discount_value || ""}
                onChange={handleDiscountValueChange}
                placeholder={
                  formData.discount_type === "percentage" ? "20" : "100.00"
                }
                disabled={isPending}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="target_type">
              What This Discount Applies To{" "}
              <span className="text-destructive">*</span>
            </Label>
            <SegmentedControl
              options={TARGET_TYPE_OPTIONS}
              value={formData.target_type}
              onValueChange={handleTargetTypeChange}
              disabled={isPending || mode === "edit"}
              className="w-full sm:w-auto"
            />
            {mode === "edit" && (
              <p className="text-xs text-muted-foreground">
                Target type cannot be changed after creation
              </p>
            )}
          </div>

          {/* Product Selector - shown when target_type is "product" */}
          {formData.target_type === "product" && (
            <div className="space-y-2">
              <Label>
                Select Products <span className="text-destructive">*</span>
              </Label>
              <ProductSelector
                products={products}
                selectedIds={selectedProductIds}
                onSelectionChange={handleProductSelectionChange}
                isLoading={isLoadingProducts}
                disabled={isPending}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="minimum_order_amount">
              Minimum Order Amount (₱)
            </Label>
            <Input
              id="minimum_order_amount"
              type="number"
              step="0.01"
              value={formData.minimum_order_amount || 0}
              onChange={handleMinimumOrderAmountChange}
              placeholder="0.00"
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Limits & Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="total_uses_cap">Total Uses Cap</Label>
            <Input
              id="total_uses_cap"
              type="number"
              value={formData.total_uses_cap || ""}
              onChange={handleTotalUsesCapChange}
              placeholder="Leave empty for unlimited uses"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of times this promotion can be used
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Date & Time</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={isoToDatetimeLocal(formData.starts_at)}
                onChange={handleStartsAtChange}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends_at">End Date & Time</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={isoToDatetimeLocal(formData.ends_at)}
                onChange={handleEndsAtChange}
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Eligibility Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="verified_student"
              checked={isVerifiedStudentChecked}
              onCheckedChange={handleVerifiedStudentChange}
              disabled={isPending}
              className="shadow-lg border-2 border-primary"
            />
            <Label htmlFor="verified_student" className="cursor-pointer">
              Verified Student Only
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="active_member"
              checked={isActiveMemberChecked}
              onCheckedChange={handleActiveMemberChange}
              disabled={isPending}
              className="shadow-lg border-2 border-primary"
            />
            <Label htmlFor="active_member" className="cursor-pointer">
              Active Organization Member
            </Label>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Leave unchecked to allow all customers to use this promotion
          </p>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-4 justify-end">
        <Button type="button" variant="outline" asChild disabled={isPending}>
          <Link href="/org/promotions">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {mode === "create" ? "Create Promotion" : "Update Promotion"}
        </Button>
      </div>
    </form>
  );
}
