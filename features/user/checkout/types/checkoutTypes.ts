import type {
  FulfillmentMethod,
  PaymentMethod,
} from "@/lib/supabase/queries/orders";

export type CheckoutCartItem = {
  id: string;
  variationId: string;
  quantity: number;
  isPreOrder: boolean;
  unitPriceSnapshot: number;
  bundleInstanceId: string | null;
  organizationId: string;
  productName: string;
  variationName: string | null;
  attributes: Record<string, string>;
  productFeaturedPhotoUrl: string | null;
};

export type CheckoutBundleInstance = {
  instanceId: string;
  bundleId: string;
  bundleName: string;
  bundlePrice: number;
  bundleFeaturedPhotoUrl: string | null;
  quantity: number;
  components: CheckoutCartItem[];
};

export type CheckoutOrgGroup = {
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  items: CheckoutCartItem[];
  bundleInstances: CheckoutBundleInstance[];
  applicablePromotions: import("@/lib/supabase/queries/orders").ApplicablePromotion[];
  initialFulfillmentMethod: FulfillmentMethod;
  initialDeliveryAddressId: string | null;
};

export type CheckoutInitialPaymentMethods = Record<string, PaymentMethod>;
