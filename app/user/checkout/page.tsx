import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCartItems } from "@/lib/supabase/queries/user/cart";
import { getCachedUserAddresses } from "@/lib/data/user-customer";
import { getCachedOrgGcashConfig } from "@/lib/data/public/org-gcash";
import { fetchApplicablePromotions } from "@/lib/supabase/queries/orders";
import { CheckoutShell } from "@/features/user/checkout/components/CheckoutShell";
import type {
  CheckoutCartItem,
  CheckoutBundleInstance,
  CheckoutOrgGroup,
} from "@/features/user/checkout/types/checkoutTypes";
import type { FulfillmentMethod } from "@/lib/supabase/queries/orders";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CheckoutPageProps {
  searchParams: Promise<{ items?: string }>;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const { items: itemsParam } = await searchParams;

  // 1. Parse + validate cart item IDs from URL
  const cartItemIds = (itemsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID_REGEX.test(s));

  if (cartItemIds.length === 0) {
    redirect("/user/cart");
  }

  // 2. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 3. Fetch all cart items via RPC (same path as the cart page — handles RLS,
  //    joins, and returns all fields we need), then filter to selected IDs.
  const allCartItems = await fetchCartItems(user.id);
  const selectedCartItems = allCartItems.filter((item) =>
    cartItemIds.includes(item.item_id),
  );

  if (selectedCartItems.length === 0) {
    redirect("/user/cart");
  }

  // 4. Map RPC CartItem → CheckoutCartItem
  const checkoutItems: CheckoutCartItem[] = selectedCartItems.map((item) => ({
    id: item.item_id,
    variationId: item.variation_id,
    quantity: item.quantity,
    isPreOrder: item.is_pre_order,
    unitPriceSnapshot: item.unit_price_snapshot,
    bundleInstanceId: item.bundle_instance_id,
    organizationId: item.organization_id,
    productName: item.product_name,
    variationName: item.variation_name || null,
    attributes: item.attributes as Record<string, string>,
    productFeaturedPhotoUrl: item.featured_photo_url,
  }));

  // 5. Collect unique org IDs and build org name map (RPC returns org name per row)
  const orgItemsMap = new Map<string, CheckoutCartItem[]>();
  const orgNameMap = new Map<string, string>();

  for (let i = 0; i < checkoutItems.length; i++) {
    const item = checkoutItems[i];
    const rpcItem = selectedCartItems[i];

    if (!orgItemsMap.has(item.organizationId)) {
      orgItemsMap.set(item.organizationId, []);
      orgNameMap.set(item.organizationId, rpcItem.organization_name);
    }
    orgItemsMap.get(item.organizationId)!.push(item);
  }

  const orgIds = [...orgItemsMap.keys()];

  // 6. Fetch org logos (not in RPC output — lightweight public table read)
  const orgLogoMap = new Map<string, string | null>();
  {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, logo_url")
      .in("id", orgIds);
    for (const org of orgs ?? []) {
      orgLogoMap.set(org.id as string, (org.logo_url as string | null) ?? null);
    }
  }

  // 7. Build bundle instance map from RPC data.
  //    The RPC returns bundle_id / bundle_name / bundle_price / bundle_quantity
  //    per component row; featured_photo_url requires a separate fetch.
  const bundleInstanceIds = [
    ...new Set(
      checkoutItems
        .map((i) => i.bundleInstanceId)
        .filter((id): id is string => id !== null),
    ),
  ];

  // Collect unique bundle IDs → fetch featured photos
  const bundleIdByInstance = new Map<string, string>();
  for (const item of selectedCartItems) {
    if (item.bundle_instance_id && item.bundle_id) {
      bundleIdByInstance.set(item.bundle_instance_id, item.bundle_id);
    }
  }
  const uniqueBundleIds = [...new Set(bundleIdByInstance.values())];
  const bundlePhotoMap = new Map<string, string | null>();
  if (uniqueBundleIds.length > 0) {
    const { data: bundles } = await supabase
      .from("bundles")
      .select("id, featured_photo_url")
      .in("id", uniqueBundleIds);
    for (const b of bundles ?? []) {
      bundlePhotoMap.set(
        b.id as string,
        (b.featured_photo_url as string | null) ?? null,
      );
    }
  }

  const bundleInstanceMap = new Map<
    string,
    Omit<CheckoutBundleInstance, "components">
  >();
  for (const instanceId of bundleInstanceIds) {
    // Find the first RPC row for this instance to read bundle metadata
    const rpcRow = selectedCartItems.find(
      (i) => i.bundle_instance_id === instanceId,
    );
    if (!rpcRow || !rpcRow.bundle_id) continue;
    bundleInstanceMap.set(instanceId, {
      instanceId,
      bundleId: rpcRow.bundle_id,
      bundleName: rpcRow.bundle_name ?? "",
      bundlePrice: rpcRow.bundle_price ?? 0,
      bundleFeaturedPhotoUrl: bundlePhotoMap.get(rpcRow.bundle_id) ?? null,
      quantity: rpcRow.bundle_quantity ?? 1,
    });
  }

  // 8. Fetch fulfillment preferences LIVE
  const { data: fulfillmentPrefs } = await supabase
    .from("cart_fulfillment_preferences")
    .select("organization_id, fulfillment_method, delivery_address_id")
    .eq("user_id", user.id)
    .in("organization_id", orgIds);

  const fulfillmentMap = new Map<
    string,
    { method: FulfillmentMethod; addressId: string | null }
  >();
  for (const pref of fulfillmentPrefs ?? []) {
    fulfillmentMap.set(pref.organization_id as string, {
      method: (pref.fulfillment_method as FulfillmentMethod) ?? "pickup",
      addressId: (pref.delivery_address_id as string | null) ?? null,
    });
  }

  // 9. Fetch user addresses (cached)
  const userAddresses = await getCachedUserAddresses(user.id);

  // 10. Fetch GCash config for all orgs (public cached — no org membership required)
  const orgGcashResults = await Promise.all(
    orgIds.map((orgId) => getCachedOrgGcashConfig(orgId)),
  );

  const gcashAvailabilityMap = new Map<string, boolean>();
  orgIds.forEach((orgId, index) => {
    gcashAvailabilityMap.set(orgId, orgGcashResults[index]?.hasGcash ?? false);
  });

  // 11. Fetch applicable promotions per org + build bundle instances per org
  const orgGroups: CheckoutOrgGroup[] = await Promise.all(
    orgIds.map(async (orgId) => {
      const orgItems = orgItemsMap.get(orgId) ?? [];
      const orgCartItemIds = orgItems.map((i) => i.id);

      // Build bundle instances for this org
      const orgBundleInstanceIds = [
        ...new Set(
          orgItems
            .map((i) => i.bundleInstanceId)
            .filter((id): id is string => id !== null),
        ),
      ];

      const orgBundleInstances: CheckoutBundleInstance[] = orgBundleInstanceIds
        .map((instanceId) => {
          const meta = bundleInstanceMap.get(instanceId);
          if (!meta) return null;
          return {
            ...meta,
            components: orgItems.filter(
              (i) => i.bundleInstanceId === instanceId,
            ),
          };
        })
        .filter((b): b is CheckoutBundleInstance => b !== null);

      // Applicable promotions (LIVE — not cached)
      // Guard against empty array: passing [] to the RPC causes PostgreSQL
      // error 42804 because the driver can't resolve [] to uuid[].
      const applicablePromotions =
        orgCartItemIds.length > 0
          ? await fetchApplicablePromotions(
              supabase,
              user.id,
              orgId,
              orgCartItemIds,
            ).catch((err) => {
              console.error(`Error fetching promotions for org ${orgId}:`, err);
              return [];
            })
          : [];

      const fulfillment = fulfillmentMap.get(orgId);

      return {
        orgId,
        orgName: orgNameMap.get(orgId) ?? "Unknown Store",
        orgLogoUrl: orgLogoMap.get(orgId) ?? null,
        items: orgItems,
        bundleInstances: orgBundleInstances,
        applicablePromotions,
        initialFulfillmentMethod: fulfillment?.method ?? "pickup",
        initialDeliveryAddressId: fulfillment?.addressId ?? null,
        hasGCashConfigured: gcashAvailabilityMap.get(orgId) ?? false,
      };
    }),
  );

  return (
    <CheckoutShell
      userId={user.id}
      orgGroups={orgGroups}
      userAddresses={userAddresses}
      cartItemIds={cartItemIds}
    />
  );
}
