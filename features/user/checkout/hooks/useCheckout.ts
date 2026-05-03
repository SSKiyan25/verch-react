"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { placeOrderAction } from "@/features/user/checkout/actions/placeOrderAction";
import { computeOrgSummary } from "@/features/user/checkout/hooks/useCheckoutOrgSummary";
import type { CheckoutOrgGroup } from "@/features/user/checkout/types/checkoutTypes";
import type {
  FulfillmentMethod,
  PaymentMethod,
  ApplicablePromotion,
  VoucherValidationResult,
} from "@/lib/supabase/queries/orders";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgSummary {
  orgId: string;
  orgName: string;
  subtotal: number;
  autoDiscount: number;
  voucherDiscount: number;
  discountAmount: number;
  orgTotal: number;
  bestAutoPromo: ApplicablePromotion | null;
  appliedVoucher: VoucherValidationResult | null;
}

interface UseCheckoutProps {
  orgGroups: CheckoutOrgGroup[];
  cartItemIds: string[];
  userAddresses: UserAddress[];
}

export interface UseCheckoutReturn {
  // State
  paymentMethods: Record<string, PaymentMethod>;
  fulfillmentPrefs: Record<
    string,
    { method: FulfillmentMethod; addressId: string | null }
  >;
  appliedVouchers: Record<
    string,
    { result: VoucherValidationResult; code: string } | null
  >;
  selectedPromotions: Record<string, string | null>;
  notes: Record<string, string>;
  isPlacing: boolean;
  placeErrors: Record<string, string>;
  hasTopLevelError: boolean;

  // Computed
  canPlace: boolean;
  grandTotal: number;
  orgSummaries: OrgSummary[];

  // Actions
  setPaymentMethod: (orgId: string, method: PaymentMethod) => void;
  setFulfillmentPref: (
    orgId: string,
    method: FulfillmentMethod,
    addressId: string | null,
  ) => void;
  setVoucherApplied: (
    orgId: string,
    result: VoucherValidationResult,
    code: string,
  ) => void;
  removeVoucher: (orgId: string) => void;
  setSelectedPromotion: (orgId: string, promotionId: string | null) => void;
  setNote: (orgId: string, note: string) => void;
  placeOrder: () => Promise<void>;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useCheckout({
  orgGroups,
  cartItemIds,
}: UseCheckoutProps): UseCheckoutReturn {
  const router = useRouter();

  // ── Initial state ──────────────────────────────────────────────────────────
  const [paymentMethods, setPaymentMethods] = useState<
    Record<string, PaymentMethod>
  >(() =>
    Object.fromEntries(
      orgGroups.map((g) => [
        g.orgId,
        // Default to cash if GCash is not configured, otherwise cash as well (default)
        "cash" as PaymentMethod,
      ]),
    ),
  );

  const [fulfillmentPrefs, setFulfillmentPrefs] = useState<
    Record<string, { method: FulfillmentMethod; addressId: string | null }>
  >(() =>
    Object.fromEntries(
      orgGroups.map((g) => [
        g.orgId,
        {
          method: g.initialFulfillmentMethod,
          addressId: g.initialDeliveryAddressId,
        },
      ]),
    ),
  );

  const [appliedVouchers, setAppliedVouchers] = useState<
    Record<string, { result: VoucherValidationResult; code: string } | null>
  >(() => Object.fromEntries(orgGroups.map((g) => [g.orgId, null])));

  const [selectedPromotions, setSelectedPromotions] = useState<
    Record<string, string | null>
  >(() => Object.fromEntries(orgGroups.map((g) => [g.orgId, null])));

  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(orgGroups.map((g) => [g.orgId, ""])),
  );

  const [isPlacing, setIsPlacing] = useState(false);
  const [placeErrors, setPlaceErrors] = useState<Record<string, string>>({});
  const [hasTopLevelError, setHasTopLevelError] = useState(false);

  // ── Per-org summaries (pure function — safe inside useMemo) ────────────────
  const orgSummaries = useMemo<OrgSummary[]>(
    () =>
      orgGroups.map((group) => {
        const summary = computeOrgSummary({
          items: group.items,
          bundleInstances: group.bundleInstances,
          applicablePromotions: group.applicablePromotions,
          appliedVoucher: appliedVouchers[group.orgId]?.result ?? null,
        });
        return {
          orgId: group.orgId,
          orgName: group.orgName,
          subtotal: summary.subtotal,
          autoDiscount: summary.autoDiscount,
          voucherDiscount: summary.voucherDiscount,
          discountAmount: summary.totalDiscount,
          orgTotal: summary.orgTotal,
          bestAutoPromo: summary.bestEligibleAutoPromo,
          appliedVoucher: appliedVouchers[group.orgId]?.result ?? null,
        };
      }),
    [orgGroups, appliedVouchers],
  );

  const grandTotal = useMemo(
    () => orgSummaries.reduce((sum, s) => sum + s.orgTotal, 0),
    [orgSummaries],
  );

  // ── canPlace ───────────────────────────────────────────────────────────────
  const canPlace = useMemo(() => {
    if (isPlacing) return false;
    return orgGroups.every((org) => {
      const payment = paymentMethods[org.orgId];
      const fulfillment = fulfillmentPrefs[org.orgId];
      if (!payment) return false;
      if (fulfillment?.method === "delivery" && !fulfillment.addressId)
        return false;
      return true;
    });
  }, [isPlacing, orgGroups, paymentMethods, fulfillmentPrefs]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const setPaymentMethod = useCallback(
    (orgId: string, method: PaymentMethod) => {
      // Prevent selecting GCash if org doesn't have it configured
      if (method === "gcash") {
        const org = orgGroups.find((g) => g.orgId === orgId);
        if (org && !org.hasGCashConfigured) {
          return; // Silently reject invalid selection
        }
      }
      setPaymentMethods((prev) => ({ ...prev, [orgId]: method }));
    },
    [orgGroups],
  );

  const setFulfillmentPref = useCallback(
    (orgId: string, method: FulfillmentMethod, addressId: string | null) => {
      setFulfillmentPrefs((prev) => ({
        ...prev,
        [orgId]: { method, addressId },
      }));
    },
    [],
  );

  const setVoucherApplied = useCallback(
    (orgId: string, result: VoucherValidationResult, code: string) => {
      setAppliedVouchers((prev) => ({ ...prev, [orgId]: { result, code } }));
    },
    [],
  );

  const removeVoucher = useCallback((orgId: string) => {
    setAppliedVouchers((prev) => ({ ...prev, [orgId]: null }));
  }, []);

  const setNote = useCallback((orgId: string, note: string) => {
    setNotes((prev) => ({ ...prev, [orgId]: note }));
  }, []);

  const setSelectedPromotion = useCallback(
    (orgId: string, promotionId: string | null) => {
      setSelectedPromotions((prev) => ({ ...prev, [orgId]: promotionId }));
    },
    [],
  );

  // ── Place order ────────────────────────────────────────────────────────────
  const placeOrder = useCallback(async () => {
    setIsPlacing(true);
    setPlaceErrors({});
    setHasTopLevelError(false);

    try {
      // Build voucher codes: orgId → voucher code string
      const voucherCodes: Record<string, string> = {};
      for (const [orgId, entry] of Object.entries(appliedVouchers)) {
        if (entry?.result.is_valid && entry.result.promotion_id) {
          voucherCodes[orgId] = entry.code;
        }
      }

      // Build notes: only non-empty
      const notesPayload: Record<string, string> = {};
      for (const [orgId, note] of Object.entries(notes)) {
        if (note.trim()) notesPayload[orgId] = note.trim();
      }

      // Build selected promotions: orgId → promotionId (or null)
      const selectedPromotionsPayload: Record<string, string | null> = {};
      for (const [orgId, promoId] of Object.entries(selectedPromotions)) {
        selectedPromotionsPayload[orgId] = promoId;
      }

      const result = await placeOrderAction({
        cartItemIds,
        paymentMethods,
        voucherCodes:
          Object.keys(voucherCodes).length > 0 ? voucherCodes : undefined,
        selectedPromotions:
          Object.keys(selectedPromotionsPayload).length > 0
            ? selectedPromotionsPayload
            : undefined,
        notes: Object.keys(notesPayload).length > 0 ? notesPayload : undefined,
      });

      if (!result.success) {
        setHasTopLevelError(true);
        return;
      }

      // Collect per-org errors
      const errors: Record<string, string> = {};
      for (const row of result.results) {
        if (row.error !== null) {
          errors[row.orgId] = row.error;
        }
      }

      if (Object.keys(errors).length === 0) {
        // All orgs succeeded
        // Check if any order is a GCash payment
        const gcashOrder = result.results.find(
          (r) => r.paymentMethod === "gcash" && r.orderId !== null,
        );

        if (gcashOrder && gcashOrder.orderId) {
          // Redirect to GCash payment page for first GCash order
          router.push(`/user/payment/${gcashOrder.orderId}?placed=true`);
        } else {
          // All cash orders, go to orders list
          router.push("/user/orders?placed=true");
        }
      } else {
        setPlaceErrors(errors);
      }
    } catch {
      setHasTopLevelError(true);
    } finally {
      setIsPlacing(false);
    }
  }, [
    cartItemIds,
    paymentMethods,
    appliedVouchers,
    selectedPromotions,
    notes,
    router,
  ]);

  return {
    paymentMethods,
    fulfillmentPrefs,
    appliedVouchers,
    selectedPromotions,
    notes,
    isPlacing,
    placeErrors,
    hasTopLevelError,
    canPlace,
    grandTotal,
    orgSummaries,
    setPaymentMethod,
    setFulfillmentPref,
    setVoucherApplied,
    removeVoucher,
    setSelectedPromotion,
    setNote,
    placeOrder,
  };
}
