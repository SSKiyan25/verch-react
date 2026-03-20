# Verch — Checkout & Orders Frontend Implementation

**Target:** Next.js 16 App Router · Supabase · TypeScript (strict) · Tailwind CSS · shadcn/ui · lucide-react  
**Scope:** User-facing checkout flow + order history + order detail  
**Read before starting:** `verch-backend-context.md`, `verch-checkout-orders-context.md`, `Ecommerce_Schema_Reference-updated-v2.md`

---

## Non-Negotiable Rules (Read First)

These are project-wide golden rules. Do not deviate.

1. **No React Query** — this project uses Next.js server-side patterns exclusively (`unstable_cache` for reads, Server Actions for writes).

2. **`unstable_cache` pattern** — `createClient()` (which calls `cookies()`) must ALWAYS be called OUTSIDE the `unstable_cache` callback. Passing it as an argument inside is correct.

```typescript
// CORRECT
export async function getCachedFoo(userId: string) {
  const supabase = await createClient(); // outside
  return unstable_cache(
    () => fetchFoo(supabase, userId), // passed as arg
    ["foo", userId],
    { revalidate: false, tags: [`foo-${userId}`] },
  )();
}
// WRONG — causes cookies() runtime error
export async function getCachedFoo(userId: string) {
  return unstable_cache(async () => {
    const supabase = await createClient(); // NEVER inside
  }, ["foo", userId])();
}
```

3. **`revalidate: false` not `revalidate: 0`** — Next.js 16 requirement for tag-only cache invalidation.

4. **Server Actions pattern — mandatory sequence:**
   1. `'use server'` at top of file
   2. `const supabase = await createClient()`
   3. `const { data: { user } } = await supabase.auth.getUser()` — never trust client-passed userId
   4. Return `{ success: false, error: 'Unauthorized' }` if no user
   5. Zod validate input — return `{ success: false, error: zodError.errors[0].message }` on failure
   6. Call RPC or query
   7. Call cache invalidation helpers
   8. Return `{ success: true, data? } | { success: false, error: string }`
   9. Wrap everything in try/catch — catch returns `{ success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }`

5. **No `any` types** — use `unknown` in catch blocks with `instanceof Error` guards.

6. **Read existing files before creating** — before creating or appending to `lib/data/cache-helpers.ts`, read it first. Before writing `lib/data/user/orders.ts`, read `lib/data/user-customer.ts` as the reference pattern. Before writing `lib/supabase/queries/orders.ts`, read `lib/supabase/queries/user-settings.ts` as the reference pattern.

7. **Public routes use plain anon client** — not the server client. Only applies to unauthenticated pages (not relevant here — all checkout/orders pages are authenticated).

8. **Server Components by default** — only use `'use client'` when the component needs interactivity, hooks, or browser APIs.

9. **Hooks own all business logic — components are dumb renderers.** Every Client Component that calls a Server Action, manages async state, or derives computed values must delegate that logic to a custom hook co-located under `features/`. The component file only handles rendering and wiring up what the hook returns. This is non-negotiable — do not put `useState` + Server Action calls directly inside components.

```
Pattern:
  features/user/orders/hooks/useCancelOrder.ts   ← all logic here
  features/user/orders/components/CancelOrderDialog.tsx  ← calls the hook, renders result

Hook responsibilities:
  - useState / useReducer for loading, error, success
  - Calling Server Actions
  - router.push / router.refresh after success
  - Deriving computed values from props

Component responsibilities:
  - Accepting props
  - Calling the hook
  - Rendering JSX based on what the hook returns
  - Zero direct Server Action calls
  - Zero business logic conditionals (those live in the hook)
```

---

## Project Stack

| Concern          | Tool                                         |
| ---------------- | -------------------------------------------- |
| Framework        | Next.js 16 (App Router)                      |
| Database         | Supabase (PostgreSQL)                        |
| Auth             | Supabase Auth                                |
| Storage (files)  | Firebase Storage (payment proofs + invoices) |
| Language         | TypeScript strict mode                       |
| Styling          | Tailwind CSS                                 |
| UI Components    | shadcn/ui                                    |
| Icons            | lucide-react                                 |
| Validation       | Zod                                          |
| Server Client    | `lib/supabase/server.ts` → `createClient()`  |
| Browser Client   | `lib/supabase/client.ts`                     |
| Firebase Helpers | `lib/firebase/storage-helpers.ts`            |

---

## Relevant Enums (from DB)

```typescript
type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";
type PaymentMethod = "cash" | "gcash";
type PaymentStatus = "pending" | "proof_submitted" | "confirmed" | "rejected";
type InvoiceStatus = "draft" | "issued" | "void";
type FulfillmentMethod = "pickup" | "delivery";
```

---

## Relevant Existing Files (Read These)

| File                                               | Why                                                          |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `lib/supabase/queries/user-settings.ts`            | Reference pattern for raw query functions + type definitions |
| `lib/data/user-customer.ts`                        | Reference pattern for `unstable_cache` wrappers              |
| `lib/data/cache-helpers.ts`                        | Must read before appending — follow existing style exactly   |
| `lib/firebase/storage-helpers.ts`                  | Firebase Storage utilities — use these for signed URLs       |
| `features/user/settings/actions/addressActions.ts` | Reference pattern for Server Actions                         |
| `app/(user)/layout.tsx`                            | Auth gate pattern for the user route group                   |

---

## Relevant RPC Functions (Already in DB)

All RPCs use `SECURITY DEFINER`. Auth is enforced inside each RPC via `auth.uid()`. All output columns are prefixed `out_`.

### Read RPCs

```
get_user_orders(p_user_id, p_status?, p_page?, p_page_size?)
  → paginated order list for the customer

get_order_detail(p_user_id, p_order_id)
  → full order detail — access granted to owner OR org staff for their org
  → out_items: JSONB array of OrderDetailItem
  → out_promotions: JSONB array of OrderDetailPromotion
  → out_invoice_number: formatted string e.g. 'INV-2026-00001'

get_applicable_promotions(p_user_id, p_org_id, p_cart_item_ids)
  → auto-trigger promotions eligible for the user + cart
  → NOT cached — call live at checkout time

validate_voucher_code(p_user_id, p_org_id, p_voucher_code, p_cart_item_ids)
  → validates a voucher code entered by the customer
  → NOT cached — call live at checkout time
```

### Write RPCs

```
place_order(p_user_id, p_cart_item_ids, p_payment_methods, p_voucher_codes, p_notes)
  → places one order per org from selected cart items
  → returns one row per org: { out_org_id, out_order_id, out_order_status,
                               out_total_amount, out_payment_method, out_error }
  → out_error = NULL means success for that org
  → failed orgs don't block successful ones

submit_payment_proof(p_user_id, p_order_id, p_proof_url, p_proof_path)
  → transitions payment status: pending|rejected → proof_submitted
  → call AFTER Firebase upload succeeds

cancel_order(p_user_id, p_order_id, p_cancellation_reason?)
  → customer: only when status = 'pending'
  → releases reserved stock automatically
```

---

## Firebase Storage Helpers (Already Built)

Located at `lib/firebase/storage-helpers.ts`. These are the ONLY Firebase utilities to use.

```typescript
// Generate a time-limited signed URL for reading a private file
getSignedDownloadUrl(filePath: string, expiresInMinutes?: number): Promise<string>

// Upload a GCash payment proof screenshot
uploadPaymentProof({ userId, orderId, file }): Promise<UploadResult>
// UploadResult = { success: true; path: string } | { success: false; error: string }

// Expiry constants
SIGNED_URL_EXPIRY.PAYMENT_PROOF  // 15 minutes
SIGNED_URL_EXPIRY.INVOICE        // 60 minutes
```

**Critical rules:**

- Never store signed URLs in the database — they expire
- Always store the Firebase Storage **path** in DB, generate signed URL at render time
- `proof_path` and `invoice_pdf_path` in DB are storage paths, not URLs
- Call `getSignedDownloadUrl(path, SIGNED_URL_EXPIRY.PAYMENT_PROOF)` to get a usable URL

---

## Existing Cache Helpers (Located in `lib/data/cache-helpers.ts`)

```typescript
invalidateCustomerCache(userId);
invalidateUserProfileCache(userId);
invalidateAddressesCache(userId);
invalidateStudentInfoCache(userId);
invalidateMembershipsCache(userId);
```

---

## Cache Tags to Add

New tags introduced in this implementation. Add helpers to `lib/data/cache-helpers.ts`:

| Tag               | Invalidated by                         |
| ----------------- | -------------------------------------- |
| `orders-{userId}` | `place_order`, `cancel_order`          |
| `order-{orderId}` | `cancel_order`, `submit_payment_proof` |

---

## Key Business Rules to Enforce in UI

### Order Lifecycle

```
pending → confirmed → preparing → ready → completed
                                        ↑
                                   cancelled (customer: pending only)
```

### What customers can do per status

| Status                              | Customer Actions                   |
| ----------------------------------- | ---------------------------------- |
| `pending` + GCash                   | Upload payment proof, Cancel order |
| `pending` + Cash                    | Cancel order only                  |
| `proof_submitted`                   | Nothing — waiting for org review   |
| `rejected`                          | Re-upload payment proof            |
| `confirmed` / `preparing` / `ready` | View only                          |
| `completed`                         | View invoice (if issued)           |
| `cancelled`                         | View only                          |

### Invoice visibility rules

- Customer sees invoice **only** when `invoice_status IN ('issued', 'void')`
- `draft` status is internal — never show to customer
- `void` invoices shown with a "Voided" indicator — no download

### Bundle display rules (in order items)

- Bundle header row (`is_bundle_header = TRUE`, `variation_id = NULL`): show bundle name + bundle price
- Bundle component rows (`bundle_instance_id` set, `is_bundle_header = FALSE`): indent under header, show product + variation name, show "Included" instead of price
- Standalone rows (`bundle_instance_id = NULL`): show product + variation name + price normally

### Checkout — place order result handling

`place_order` returns one row per org. The UI must:

- Handle partial failures — some orgs succeed, some fail
- Show per-org error if `out_error IS NOT NULL`
- Redirect to `/user/orders?placed=true` only when ALL orgs succeed
- Keep checkout page open on partial failure — show errors inline per org group

### Promotions at checkout

- Max one `auto` + one `voucher_code` per org per order
- Auto promotions are shown read-only — fetched server-side
- Voucher codes entered manually — validated via `applyVoucherAction` before place order
- `is_eligible = false` auto promos should be shown grayed out with `ineligible_reason` tooltip
- Voucher `is_valid = false` shows `invalid_reason` as inline error below input

---

## Implementation Phases

Implement in this exact order. Do not skip ahead — each phase is a dependency for the next.

---

## Phase 1: Data Layer

**Goal:** TypeScript types, raw query functions, cache wrappers, cache helper additions. No UI.

### Files to Create

#### `lib/supabase/queries/orders.ts`

Read `lib/supabase/queries/user-settings.ts` first. Follow its patterns exactly.

**Types to define:**

```typescript
export type UserOrderListItem = {
  order_id: string;
  org_id: string;
  org_name: string;
  org_logo_url: string | null;
  status: OrderStatus;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  fulfillment_method: FulfillmentMethod;
  item_count: number;
  created_at: string;
  total_count: number;
};

export type OrderDetailItem = {
  id: string;
  variation_id: string | null;
  bundle_instance_id: string | null;
  is_bundle_header: boolean;
  bundle_id: string | null;
  bundle_name_snapshot: string | null;
  product_name_snapshot: string | null;
  variation_name_snapshot: string | null;
  attributes_snapshot: Record<string, string>;
  unit_price: number;
  quantity: number;
  subtotal: number;
  commission_amount: number;
  is_pre_order: boolean;
};

export type OrderDetailPromotion = {
  promotion_id: string;
  name: string;
  discount_type: "percentage" | "fixed" | "free_item";
  discount_value: number | null;
  discount_amount: number;
  trigger_type: "auto" | "voucher_code";
  voucher_code: string | null;
};

export type OrderDetail = {
  order_id: string;
  org_id: string;
  org_name: string;
  status: OrderStatus;
  fulfillment_method: FulfillmentMethod;
  delivery_address_snapshot: {
    recipient_name: string;
    contact_number: string;
    street: string;
    barangay: string | null;
    city: string;
    province: string;
    postal_code: string | null;
    notes: string | null;
  } | null;
  subtotal: number;
  discount_amount: number;
  commission_rate: number;
  commission_amount: number;
  total_amount: number;
  org_payout_amount: number;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  items: OrderDetailItem[];
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  proof_path: string | null;
  rejection_note: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: InvoiceStatus | null;
  invoice_pdf_path: string | null;
  promotions: OrderDetailPromotion[];
};

export type ApplicablePromotion = {
  promotion_id: string;
  name: string;
  description: string | null;
  trigger_type: "auto" | "voucher_code";
  discount_type: "percentage" | "fixed" | "free_item";
  discount_value: number | null;
  minimum_order_amount: number | null;
  is_eligible: boolean;
  ineligible_reason: string | null;
};

export type VoucherValidationResult = {
  promotion_id: string | null;
  discount_type: "percentage" | "fixed" | "free_item" | null;
  discount_value: number | null;
  minimum_order_amount: number | null;
  is_valid: boolean;
  invalid_reason: string | null;
};
```

**Raw fetcher functions** (accept `supabase` client as first arg — never instantiate inside):

```typescript
// Throws on Supabase error. Returns typed data.
export async function fetchUserOrders(
  supabase: SupabaseClient,
  userId: string,
  status?: OrderStatus,
  page = 1,
  pageSize = 10,
): Promise<UserOrderListItem[]>;

export async function fetchOrderDetail(
  supabase: SupabaseClient,
  userId: string,
  orderId: string,
): Promise<OrderDetail | null>;
// Parse out_items and out_promotions from JSONB:
// items = typeof data.out_items === 'string' ? JSON.parse(data.out_items) : data.out_items ?? []
// promotions = typeof data.out_promotions === 'string' ? JSON.parse(data.out_promotions) : data.out_promotions ?? []

export async function fetchApplicablePromotions(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  cartItemIds: string[],
): Promise<ApplicablePromotion[]>;

export async function validateVoucherCode(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  voucherCode: string,
  cartItemIds: string[],
): Promise<VoucherValidationResult>;
```

---

#### `lib/data/user/orders.ts`

Read `lib/data/user-customer.ts` first. Follow its `unstable_cache` pattern exactly.

```typescript
// Paginated order list for customer — one cache entry per status+page combination
export async function getCachedUserOrders(
  userId: string,
  status?: OrderStatus,
  page = 1,
  pageSize = 10,
): Promise<UserOrderListItem[]>;
// key: ['user-orders', userId, status ?? 'all', page, pageSize]
// tags: [`orders-${userId}`]
// revalidate: false

// Full order detail
export async function getCachedOrderDetail(
  userId: string,
  orderId: string,
): Promise<OrderDetail | null>;
// key: ['order-detail', userId, orderId]
// tags: [`order-${orderId}`]
// revalidate: false
```

Note: `fetchApplicablePromotions` and `validateVoucherCode` are NOT cached — they are called live.

---

#### `lib/data/cache-helpers.ts` (append only)

Read the existing file first. Append these helpers — do not modify or remove existing ones:

```typescript
export async function invalidateUserOrdersCache(userId: string) {
  revalidateTag(`orders-${userId}`);
}

export async function invalidateOrderCache(orderId: string, userId: string) {
  revalidateTag(`order-${orderId}`);
  revalidateTag(`orders-${userId}`);
}
```

---

## Phase 2: Server Actions + Zod Schemas

**Goal:** All mutations callable. No UI yet.

### Files to Create

#### `features/user/checkout/schemas/checkoutSchemas.ts`

```typescript
import { z } from "zod";

export const PlaceOrderSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1, "No items selected"),
  paymentMethods: z.record(z.string().uuid(), z.enum(["cash", "gcash"])),
  voucherCodes: z
    .record(z.string().uuid(), z.string().min(1).max(50))
    .optional(),
  notes: z.record(z.string().uuid(), z.string().max(500)).optional(),
});

export const ApplyVoucherSchema = z.object({
  orgId: z.string().uuid(),
  voucherCode: z
    .string()
    .min(1)
    .max(50)
    .transform((s) => s.trim().toUpperCase()),
  cartItemIds: z.array(z.string().uuid()).min(1),
});

export const CancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  cancellationReason: z.string().max(500).optional(),
});

export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
export type ApplyVoucherInput = z.infer<typeof ApplyVoucherSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
```

---

#### `features/user/checkout/actions/placeOrderAction.ts`

```typescript
"use server";
// Input: PlaceOrderInput (validated with PlaceOrderSchema)
// Calls: supabase.rpc('place_order', { p_user_id, p_cart_item_ids, p_payment_methods, p_voucher_codes, p_notes })
// p_payment_methods, p_voucher_codes, p_notes must be passed as JSONB-compatible objects
// RPC returns array of per-org rows

// Return type:
type PlaceOrderResult =
  | {
      success: true;
      results: Array<{
        orgId: string;
        orderId: string | null;
        orderStatus: OrderStatus | null;
        totalAmount: number | null;
        paymentMethod: PaymentMethod | null;
        error: string | null;
      }>;
    }
  | { success: false; error: string };

// After calling RPC:
// For each row where out_error IS NULL: call invalidateOrderCache(out_order_id, userId) + invalidateUserOrdersCache(userId)
// For each row where out_error IS NOT NULL: collect error
// Always return the full results array — UI decides what to do with partial failures
```

---

#### `features/user/checkout/actions/applyVoucherAction.ts`

```typescript
"use server";
// Input: ApplyVoucherInput (validated with ApplyVoucherSchema)
// Calls: validateVoucherCode() from lib/supabase/queries/orders.ts
// No cache invalidation — read-only validation
// Return: { success: true; data: VoucherValidationResult } | { success: false; error: string }
// Note: even when voucher is invalid, return success: true with data.is_valid = false
// Only return success: false for auth failures or unexpected errors
```

---

#### `features/user/orders/actions/cancelOrderAction.ts`

```typescript
"use server";
// Input: CancelOrderInput (validated with CancelOrderSchema)
// Before cancelling: fetch order to get org_id for cache invalidation
//   const { data: order } = await supabase
//     .from('orders')
//     .select('organization_id, user_id')
//     .eq('id', orderId)
//     .single()
// Calls: supabase.rpc('cancel_order', { p_user_id: user.id, p_order_id, p_cancellation_reason })
// On success: invalidateOrderCache(orderId, userId) + invalidateUserOrdersCache(userId)
// Return: { success: true } | { success: false; error: string }
```

---

#### `features/user/orders/actions/submitPaymentProofAction.ts`

Check if this already exists (created in a previous session). If it exists — read it and verify it follows the mandatory Server Actions pattern. If something is wrong, fix it. If it doesn't exist, create it:

```typescript
"use server";
// Input: { orderId: string, proofPath: string, proofUrl: string }
// Validate: orderId is UUID, proofPath is non-empty string
// Calls: supabase.rpc('submit_payment_proof', {
//   p_user_id: user.id,
//   p_order_id: orderId,
//   p_proof_url: proofUrl,
//   p_proof_path: proofPath
// })
// On success: invalidateOrderCache(orderId, userId)
// Return: { success: true } | { success: false; error: string }
```

---

#### `features/user/orders/actions/getPaymentProofUrlAction.ts`

```typescript
"use server";
// Input: { proofPath: string }
// Auth check — only order owner can get the URL
// Verify the proof_path belongs to an order owned by the caller:
//   SELECT order_id FROM order_payments op
//   JOIN orders o ON o.id = op.order_id
//   WHERE op.proof_path = proofPath AND o.user_id = user.id
// Calls: getSignedDownloadUrl(proofPath, SIGNED_URL_EXPIRY.PAYMENT_PROOF)
// Return: { success: true; url: string } | { success: false; error: string }
```

---

## Phase 3: Order History Page (`/user/orders`)

**Goal:** Customer-facing paginated order list with status tabs.

### Files to Create

#### `app/(user)/orders/page.tsx`

Server Component. Pattern:

```typescript
// 1. Get userId from supabase.auth.getUser()
// 2. Read searchParams.status (validate it's a valid OrderStatus or undefined)
// 3. Read searchParams.page (parse to number, default 1)
// 4. Call getCachedUserOrders(userId, status, page)
// 5. Pass data to OrdersPageShell
// 6. Wrap in Suspense with OrderCardSkeleton x3 as fallback
```

---

#### `features/user/orders/components/OrdersPageShell.tsx`

Client Component. Props:

```typescript
{
  orders: UserOrderListItem[]
  totalCount: number
  currentPage: number
  currentStatus: string | undefined
}
```

Renders:

1. Page title + description
2. `OrderStatusTabs` — tab per status
3. List of `OrderCard` OR `EmptyOrders` if empty
4. Pagination — prev/next buttons, updates `?page=` param

---

#### `features/user/orders/components/OrderStatusTabs.tsx`

Client Component. Tabs:

- **All** (no status filter)
- **Pending**
- **Confirmed**
- **Preparing**
- **Ready**
- **Completed**
- **Cancelled**

Tab click → `router.push('/user/orders?status=<value>')`. All tab clears status param.  
Active tab derived from `currentStatus` prop.

---

#### `features/user/orders/components/OrderCard.tsx`

Props: `order: UserOrderListItem`

Display:

- Org logo (fallback: initials in a colored circle) + org name
- Order ID: first 8 chars + `...` — copy-to-clipboard on click (use `navigator.clipboard.writeText`)
- **Status badge** — color-coded:
  - `pending` → amber/yellow
  - `confirmed` → blue
  - `preparing` → purple
  - `ready` → indigo
  - `completed` → green
  - `cancelled` → red/destructive
- **Payment status badge** — smaller, secondary styling
- Fulfillment icon: `Store` (pickup) or `Truck` (delivery) from lucide-react
- `{item_count} item{s}` · `₱{total_amount formatted}`
- Date: use `formatRelative` or similar — "2 days ago" for < 7 days, absolute date for older
- **CTA area** — render based on status + payment:

```
payment_status='pending' AND payment_method='gcash'
  → Primary button: "Upload Payment Proof" → links to /user/orders/[orderId]

payment_status='rejected' AND payment_method='gcash'
  → Destructive button: "Re-upload Proof" → links to /user/orders/[orderId]

payment_status='proof_submitted'
  → Muted text: "Awaiting payment review"

status='pending' (any payment)
  → Ghost secondary button: "Cancel Order" → opens CancelOrderDialog inline OR links to detail

status='completed' AND invoice_status IN ('issued', 'void') — note: UserOrderListItem doesn't include invoice_status
  → Ghost button: "View Order" → links to /user/orders/[orderId]
```

Entire card is wrapped in a `Link` to `/user/orders/${order.order_id}`.

---

#### `features/user/orders/components/OrderCardSkeleton.tsx`

Skeleton placeholder matching `OrderCard` dimensions. Used in Suspense fallback. Render 3 of these.

---

#### `features/user/orders/components/EmptyOrders.tsx`

Props: `{ status: string | undefined }`

Message varies:

- `undefined` (All) → "You haven't placed any orders yet"
- `pending` → "No pending orders"
- `completed` → "No completed orders"
- etc.

Include a "Browse Stores" CTA button linking to `/stores`.

---

### Hooks — Phase 3

#### `features/user/orders/hooks/useOrdersPagination.ts`

```typescript
// Encapsulates pagination + tab state derived from URL params
// Props: { currentPage: number, currentStatus: string | undefined, totalCount: number, pageSize: number }
// Returns:
{
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  goToNextPage: () => void      // router.push with page+1
  goToPrevPage: () => void      // router.push with page-1
  goToStatus: (status: string | undefined) => void  // router.push with new status, resets page to 1
}
```

Used by: `OrdersPageShell`

---

#### `features/user/orders/hooks/useOrderCardActions.ts`

```typescript
// Encapsulates CTA logic for a single order card
// Props: order: UserOrderListItem
// Returns:
{
  showUploadProof: boolean; // payment_status='pending' AND payment_method='gcash'
  showReuploadProof: boolean; // payment_status='rejected' AND payment_method='gcash'
  showAwaitingReview: boolean; // payment_status='proof_submitted'
  showCancel: boolean; // status='pending'
  statusBadgeVariant: "amber" | "blue" | "purple" | "indigo" | "green" | "red";
  formattedTotal: string; // '₱1,234.00'
  formattedDate: string; // '2 days ago' or 'Mar 15, 2026'
  itemCountLabel: string; // '3 items'
}
```

Used by: `OrderCard`

---

## Phase 4: Order Detail Page (`/user/orders/[orderId]`)

**Goal:** Full order breakdown. Payment proof upload. Order cancellation.

### Files to Create

#### `app/(user)/orders/[orderId]/page.tsx`

Server Component:

```typescript
// 1. Get userId from supabase.auth.getUser()
// 2. Await params to get orderId
// 3. Call getCachedOrderDetail(userId, orderId)
// 4. If null → return notFound()
// 5. Pass to OrderDetailShell
```

---

#### `features/user/orders/components/OrderDetailShell.tsx`

Client Component (needs router for cancel redirect). Props: `{ order: OrderDetail }`.

Layout (top to bottom):

1. Back button → `/user/orders`
2. Order header: org name, Order ID (truncated + copy), date, status badge
3. `OrderStatusTimeline`
4. `OrderItemsTable`
5. `OrderFinancialSummary`
6. `OrderPaymentSection` (contains `GCashProofUploader` conditionally)
7. `OrderInvoiceSection` (conditionally rendered)
8. `CancelOrderDialog` (mounted always, visible only when cancellable)

---

#### `features/user/orders/components/OrderStatusTimeline.tsx`

Props: `{ order: Pick<OrderDetail, 'status' | 'cancelled_at' | 'cancellation_reason' | 'created_at'> }`

Steps: Placed → Confirmed → Preparing → Ready → Completed

- Horizontal on desktop, vertical on mobile
- Current active step has a pulsing ring indicator
- Completed steps show a checkmark
- Cancelled: show as a terminal red branch after the last reached step, display `cancellation_reason` below

---

#### `features/user/orders/components/OrderItemsTable.tsx`

Props: `{ items: OrderDetailItem[] }`

Rendering logic:

```
1. Group items: sort so bundle header comes first, its components follow
   - Group by bundle_instance_id where NOT NULL
   - Standalone items (bundle_instance_id = NULL) rendered individually

2. Bundle header row (is_bundle_header = TRUE):
   - Show bundle_name_snapshot
   - Show unit_price (bundle price) × quantity = subtotal
   - Slightly emphasized background (e.g. bg-muted/50)

3. Bundle component rows (bundle_instance_id set, is_bundle_header = FALSE):
   - Indent with pl-6 or similar
   - Show product_name_snapshot + variation_name_snapshot
   - Show attributes_snapshot as small chips
   - Show "Included" instead of price
   - No subtotal column

4. Standalone rows (bundle_instance_id = NULL):
   - Show product_name_snapshot + variation_name_snapshot
   - Show attributes_snapshot as small chips
   - Show unit_price × quantity = subtotal

5. Pre-order badge on is_pre_order = TRUE rows
```

Column headers: Item | Qty | Unit Price | Subtotal

---

#### `features/user/orders/components/OrderFinancialSummary.tsx`

Props:

```typescript
{
  subtotal: number
  discountAmount: number
  totalAmount: number
  promotions: OrderDetailPromotion[]
  fulfillmentMethod: FulfillmentMethod
  deliveryAddressSnapshot: OrderDetail['delivery_address_snapshot']
  // commission fields hidden from customer — not passed here
}
```

Display:

- Subtotal row
- Per-promotion discount row: "-₱{discount_amount}" with promo name (voucher code in parens if `trigger_type = 'voucher_code'`)
- Horizontal divider
- **Total** row (bold, larger)
- Fulfillment note: "Pickup" with Store icon OR "Delivery to {city}, {province}" with Truck icon

---

#### `features/user/orders/components/OrderPaymentSection.tsx`

Props: `{ order: OrderDetail }`

Display:

- Payment method label + icon (banknote for cash, phone for gcash)
- Payment status badge
- If `payment_status = 'rejected'`: show `rejection_note` in a destructive/red Alert component above the uploader
- If `payment_method = 'gcash'` AND `payment_status IN ('pending', 'rejected')`: render `GCashProofUploader`
- If `payment_status = 'proof_submitted'`: show "Your proof has been submitted. Waiting for the store to review."
- If `payment_status = 'confirmed'`: show "Payment confirmed ✓"

---

#### `features/user/orders/components/GCashProofUploader.tsx`

Client Component. Props:

```typescript
{
  orderId: string;
  currentProofPath: string | null; // existing proof path if re-uploading
}
```

Behavior:

1. On mount: if `currentProofPath` exists, call `getPaymentProofUrlAction(currentProofPath)` to show current proof image
2. Show current proof as an `<img>` with a "Replace" label if it exists
3. File input: accept `image/jpeg,image/png,image/webp`, max 10MB (validate client-side before upload)
4. On file select:
   a. Show preview of selected image
   b. "Upload Proof" button appears
5. On upload button click:
   a. Set loading state
   b. Call `uploadPaymentProofAction` (from existing `features/user/checkout/actions/`) → get `path`
   c. If upload fails: show error, stop
   d. Call `submitPaymentProofAction({ orderId, proofPath: path, proofUrl: '' })`
   Note: `proofUrl` passed as empty string — the DB stores path, URL is generated at render time
   e. If RPC fails: call `deleteStorageFile(path)` to clean up orphaned Firebase file, show error
   f. On success: `router.refresh()` to reload page with new payment_status

State: `isUploading`, `previewUrl`, `error`, `currentSignedUrl`

---

#### `features/user/orders/components/OrderInvoiceSection.tsx`

Props: `{ invoiceId: string | null, invoiceNumber: string | null, invoiceStatus: InvoiceStatus | null, invoicePdfPath: string | null }`

Render nothing if `invoiceId = null`.  
Render nothing if `invoiceStatus = 'draft'` (draft is internal — never show to customer).

Display when `invoiceStatus = 'issued'`:

- Invoice number (`INV-2026-00001`)
- "Issued" badge (green)
- "Download Invoice" button → calls a Server Action `getInvoiceUrlAction(invoicePdfPath)` → opens signed URL in new tab

Display when `invoiceStatus = 'void'`:

- Invoice number (strikethrough styling)
- "Voided" badge (red/destructive)
- No download button

---

#### `features/user/orders/components/CancelOrderDialog.tsx`

Client Component. Props:

```typescript
{
  orderId: string;
  orderStatus: OrderStatus;
}
```

Only renders (and shows trigger button) when `orderStatus = 'pending'`.

Uses shadcn `AlertDialog`:

- Trigger: "Cancel Order" button (destructive variant)
- Title: "Cancel this order?"
- Description: "This action cannot be undone. Your cart items will not be restored."
- Optional `Textarea` for cancellation reason (max 500 chars)
- Cancel button: dismisses dialog
- Confirm button: calls `useCancelOrder` hook's `cancel()` method

Delegates ALL logic to `useCancelOrder` hook — component only renders.

---

### Hooks — Phase 4

#### `features/user/orders/hooks/useCancelOrder.ts`

```typescript
// Props: { orderId: string }
// Returns:
{
  reason: string
  setReason: (r: string) => void
  isCancelling: boolean
  error: string | null
  cancel: () => Promise<void>   // calls cancelOrderAction, router.push on success
}
```

Implementation:

1. `useState` for `reason`, `isCancelling`, `error`
2. `cancel()` sets `isCancelling = true`, calls `cancelOrderAction({ orderId, cancellationReason: reason })`
3. On success: `router.push('/user/orders')` + toast
4. On error: set `error = result.error`, keep dialog open
5. Always set `isCancelling = false` in finally

Used by: `CancelOrderDialog`

---

#### `features/user/orders/hooks/useGCashProofUploader.ts`

```typescript
// Props: { orderId: string, currentProofPath: string | null }
// Returns:
{
  currentSignedUrl: string | null   // fetched from getPaymentProofUrlAction on mount
  previewUrl: string | null         // local object URL of selected file
  selectedFile: File | null
  isLoadingExisting: boolean        // true while fetching signed URL on mount
  isUploading: boolean
  error: string | null
  onFileSelect: (file: File) => void
  onUpload: () => Promise<void>     // full upload flow
  onReset: () => void               // clears selectedFile + previewUrl
}
```

Implementation:

1. On mount: if `currentProofPath`, call `getPaymentProofUrlAction` → set `currentSignedUrl`
2. `onFileSelect`: validate type + size client-side (JPG/PNG/WEBP, max 10MB), set `selectedFile` + `previewUrl` via `URL.createObjectURL`
3. `onUpload`:
   a. Set `isUploading = true`
   b. Call `uploadPaymentProofAction` → get `path`
   c. If fails: set error, stop
   d. Call `submitPaymentProofAction({ orderId, proofPath: path, proofUrl: '' })`
   e. If RPC fails: call `deleteStorageFile(path)` to clean up orphaned file, set error
   f. On success: `router.refresh()`
   g. Finally: set `isUploading = false`
4. Cleanup: revoke object URL on unmount via `useEffect` return

Used by: `GCashProofUploader`

---

#### `features/user/orders/hooks/useOrderDetail.ts`

```typescript
// Props: { order: OrderDetail }
// Returns derived display values — keeps OrderDetailShell purely presentational
{
  canCancel: boolean                     // status === 'pending'
  showPaymentUploader: boolean           // gcash + pending|rejected
  showInvoice: boolean                   // invoice exists + not draft
  groupedItems: GroupedOrderItem[]       // bundles grouped, components nested
  formattedSubtotal: string
  formattedDiscount: string
  formattedTotal: string
  statusBadgeVariant: string
  fulfillmentLabel: string
  addressSnippet: string | null          // 'City, Province' for delivery
}

type GroupedOrderItem =
  | { type: 'standalone'; item: OrderDetailItem }
  | { type: 'bundle'; header: OrderDetailItem; components: OrderDetailItem[] }
```

Used by: `OrderDetailShell`

---

## Phase 5: Checkout Page (`/user/checkout`)

**Goal:** Full checkout flow — review selected items, set fulfillment + payment per org, apply vouchers, place order.

### Files to Create

#### `app/(user)/checkout/page.tsx`

Server Component:

```typescript
// 1. Read searchParams.items — comma-separated cart item UUIDs
// 2. Parse and validate: split by ',', filter valid UUIDs
//    If empty or all invalid → redirect('/user/cart')
// 3. Get userId from supabase.auth.getUser()
// 4. Fetch selected cart items LIVE (not cached — must be current):
//    supabase.from('cart_items')
//      .select(`
//        id, variation_id, quantity, is_pre_order, bundle_instance_id,
//        unit_price_snapshot, organization_id,
//        product_variations (
//          variation_name, attributes, price,
//          products ( id, name, featured_photo_url )
//        )
//      `)
//      .in('id', cartItemIds)
//      .eq('user_id', userId)
//
// 5. Fetch bundle instances for any cart items with bundle_instance_id:
//    supabase.from('cart_bundle_instances')
//      .select('id, quantity, bundle_id, bundles ( id, name, price, featured_photo_url )')
//      .in('id', bundleInstanceIds)
//      .eq('user_id', userId)
//
// 6. If no items found → redirect('/user/cart')
//
// 7. Group items by organization_id
//
// 8. For each org group: call fetchApplicablePromotions(supabase, userId, orgId, orgCartItemIds)
//
// 9. Fetch fulfillment preferences LIVE:
//    supabase.from('cart_fulfillment_preferences')
//      .select('organization_id, fulfillment_method, delivery_address_id')
//      .eq('user_id', userId)
//      .in('organization_id', orgIds)
//
// 10. Fetch user addresses (cached is fine here):
//     getCachedUserAddresses(userId)  — from lib/data/user-customer.ts
//
// 11. Pass all data to CheckoutShell
```

---

#### `features/user/checkout/components/CheckoutShell.tsx`

Client Component. The main state container for checkout.

Props:

```typescript
{
  userId: string
  orgGroups: Array<{
    orgId: string
    orgName: string
    orgLogoUrl: string | null
    items: CheckoutCartItem[]           // standalone cart items for this org
    bundleInstances: CheckoutBundleInstance[] // bundles for this org
    applicablePromotions: ApplicablePromotion[]
    initialFulfillmentMethod: FulfillmentMethod
    initialDeliveryAddressId: string | null
  }>
  userAddresses: UserAddress[]
  cartItemIds: string[]                  // all selected cart item IDs (flat)
}
```

State:

```typescript
paymentMethods: Record<orgId, PaymentMethod>; // initialized to 'cash' for each org
fulfillmentPrefs: Record<
  orgId,
  { method: FulfillmentMethod; addressId: string | null }
>;
appliedVouchers: Record<orgId, VoucherValidationResult | null>;
notes: Record<orgId, string>;
isPlacing: boolean;
placeErrors: Record<orgId, string>;
```

Layout:

- Mobile: single column — org groups stacked, sticky bottom bar with total + CTA
- Desktop: two-column — org groups on left (2/3 width), `CheckoutOrderSummary` sticky on right (1/3 width)

On place order:

```typescript
// 1. setIsPlacing(true)
// 2. Build payload:
const input = {
  cartItemIds,
  paymentMethods, // Record<orgId, 'cash'|'gcash'>
  voucherCodes: Object.fromEntries(
    Object.entries(appliedVouchers)
      .filter(([, v]) => v?.is_valid && v.promotion_id)
      .map(([orgId, v]) => [orgId /* voucher code string */]),
  ),
  notes,
};
// 3. Call placeOrderAction(input)
// 4. Iterate results:
//    - All success (no row has error) → router.push('/user/orders?placed=true')
//    - Some failed → setPlaceErrors(failed orgs) — keep page open
//    - All failed → show top-level error banner
// 5. setIsPlacing(false)
```

---

#### `features/user/checkout/components/CheckoutOrgGroup.tsx`

Props:

```typescript
{
  orgId: string
  orgName: string
  orgLogoUrl: string | null
  items: CheckoutCartItem[]
  bundleInstances: CheckoutBundleInstance[]
  applicablePromotions: ApplicablePromotion[]
  paymentMethod: PaymentMethod
  fulfillmentMethod: FulfillmentMethod
  deliveryAddressId: string | null
  userAddresses: UserAddress[]
  appliedVoucher: VoucherValidationResult | null
  cartItemIds: string[]
  error: string | null                    // from placeErrors[orgId]
  onPaymentChange: (method: PaymentMethod) => void
  onFulfillmentChange: (method: FulfillmentMethod, addressId: string | null) => void
  onVoucherApplied: (result: VoucherValidationResult, code: string) => void
  onVoucherRemoved: () => void
  onNoteChange: (note: string) => void
}
```

Renders:

1. Org header (logo + name)
2. Error banner if `error` is set (destructive Alert)
3. List of `CheckoutItemRow` for standalone items
4. List of bundle headers + their components (similar to `OrderItemsTable` grouping)
5. `CheckoutFulfillmentSelector`
6. `CheckoutPaymentSelector`
7. `CheckoutVoucherInput`
8. Applied auto promotions as `CheckoutPromotionBadge` (read-only)
9. Applied voucher as `CheckoutPromotionBadge` with remove button
10. Per-org subtotal line + discount line (if voucher applied)

---

#### `features/user/checkout/components/CheckoutItemRow.tsx`

Props: `{ item: CheckoutCartItem, isComponent?: boolean }`

Display:

- `isComponent = true`: indented, variation name only, "Included" label
- Standard: product thumbnail (40×40px), product + variation name, attributes chips, qty, unit price
- Pre-order badge if `is_pre_order = true`
- Read-only — no quantity controls on checkout page

---

#### `features/user/checkout/components/CheckoutFulfillmentSelector.tsx`

Client Component (but controlled — state lives in `CheckoutShell`).

Props:

```typescript
{
  orgId: string
  selectedMethod: FulfillmentMethod
  selectedAddressId: string | null
  userAddresses: UserAddress[]
  onChange: (method: FulfillmentMethod, addressId: string | null) => void
}
```

Renders:

- Two-button toggle: "Pickup" (Store icon) | "Delivery" (Truck icon)
- If Delivery selected: shadcn `Select` dropdown with user addresses
  - Address format: `{label} — {recipient_name}, {street}, {city}`
  - If no addresses: show "Add a delivery address →" link to `/user/settings/addresses`
- If Pickup: no address selector

---

#### `features/user/checkout/components/CheckoutPaymentSelector.tsx`

Controlled component. Props:

```typescript
{
  selected: PaymentMethod
  onChange: (method: PaymentMethod) => void
}
```

Renders shadcn `RadioGroup`:

- **Cash** option: Banknote icon, "Pay in person"
- **GCash** option: Phone icon, "You'll upload proof after placing"

---

#### `features/user/checkout/components/CheckoutVoucherInput.tsx`

Client Component.

Props:

```typescript
{
  orgId: string
  cartItemIds: string[]
  appliedVoucher: VoucherValidationResult | null
  onApplied: (result: VoucherValidationResult, code: string) => void
  onRemoved: () => void
}
```

State: `inputValue`, `isValidating`, `error`

Behavior:

- If `appliedVoucher` is set: show applied state with discount preview + remove button — hide input
- If not applied: show text input + "Apply" button
- On Apply:
  1. `setIsValidating(true)`
  2. Call `applyVoucherAction({ orgId, voucherCode: inputValue, cartItemIds })`
  3. If `data.is_valid = true`: call `onApplied(data, inputValue)`, clear error
  4. If `data.is_valid = false`: set `error = data.invalid_reason`, keep input open
  5. `setIsValidating(false)`
- Input: uppercase transform on change, max 50 chars
- Error shown as small red text below input

---

#### `features/user/checkout/components/CheckoutPromotionBadge.tsx`

Props:

```typescript
{
  name: string
  discountType: 'percentage' | 'fixed' | 'free_item'
  discountValue: number | null
  isEligible?: boolean          // for auto promos: grayed out if not eligible
  ineligibleReason?: string     // tooltip content for ineligible auto promos
  onRemove?: () => void         // if present, shows remove (×) button — for vouchers
}
```

Display:

- Tag/pill style
- Eligible auto promo: green pill, "Auto: {name} · -{value}"
- Ineligible auto promo: gray pill with strikethrough, tooltip showing `ineligibleReason`
- Applied voucher: blue pill with `×` button, "{name} · -{value}"

---

#### `features/user/checkout/components/CheckoutOrderSummary.tsx`

Props:

```typescript
{
  orgGroups: Array<{
    orgId: string
    orgName: string
    subtotal: number              // computed from items in this org
    appliedVoucher: VoucherValidationResult | null
    applicableAutoPromo: ApplicablePromotion | null   // best eligible auto promo
  }>
  isPlacing: boolean
  onPlaceOrder: () => void
  canPlace: boolean               // false if any org missing payment method or delivery address
}
```

Display:

- Per-org breakdown:
  - Org name (small heading)
  - Subtotal
  - Discount line if promotion applied: "-₱{amount}" or "-{percent}%"
  - Org total after discount
- Divider
- **Grand Total** (bold, prominent)
- `PlaceOrderButton` at bottom
- Disabled state when `!canPlace` with tooltip explaining what's missing

---

#### `features/user/checkout/components/PlaceOrderButton.tsx`

Props: `{ isPlacing: boolean, disabled: boolean, grandTotal: number, onClick: () => void }`

States:

- Idle: "Place Order · ₱{grandTotal formatted}"
- Loading: spinner + "Placing order..."
- Disabled: grayed out (use `disabled` attribute + `cursor-not-allowed`)

---

### Hooks — Phase 5

#### `features/user/checkout/hooks/useCheckout.ts`

The most important hook in the checkout flow. Owns all checkout state and the place order flow. `CheckoutShell` becomes a thin wrapper around this hook.

```typescript
// Props: same shape as CheckoutShell props
// Returns:
{
  // State
  paymentMethods:   Record<string, PaymentMethod>
  fulfillmentPrefs: Record<string, { method: FulfillmentMethod; addressId: string | null }>
  appliedVouchers:  Record<string, { result: VoucherValidationResult; code: string } | null>
  appliedVoucherCodes: Record<string, string>   // orgId → voucher code string (needed for place_order payload)
  notes:            Record<string, string>
  isPlacing:        boolean
  placeErrors:      Record<string, string>
  hasTopLevelError: boolean

  // Computed
  canPlace:         boolean
  grandTotal:       number
  orgSummaries: Array<{
    orgId: string
    orgName: string
    subtotal: number
    discountAmount: number
    orgTotal: number
    bestAutoPromo: ApplicablePromotion | null
    appliedVoucher: VoucherValidationResult | null
  }>

  // Actions
  setPaymentMethod:    (orgId: string, method: PaymentMethod) => void
  setFulfillmentPref:  (orgId: string, method: FulfillmentMethod, addressId: string | null) => void
  setVoucherApplied:   (orgId: string, result: VoucherValidationResult, code: string) => void
  removeVoucher:       (orgId: string) => void
  setNote:             (orgId: string, note: string) => void
  placeOrder:          () => Promise<void>
}
```

Implementation of `placeOrder()`:

1. Set `isPlacing = true`, clear `placeErrors`
2. Build payload from state
3. Call `placeOrderAction(payload)`
4. If `success = false`: set `hasTopLevelError = true`, set `isPlacing = false`, return
5. Iterate `results`:
   - Collect failed orgs into `placeErrors`
   - If all orgs succeeded: `router.push('/user/orders?placed=true')`
   - If partial: keep page, `placeErrors` drives inline error banners
6. Set `isPlacing = false`

Used by: `CheckoutShell`

---

#### `features/user/checkout/hooks/useVoucherInput.ts`

```typescript
// Props: { orgId: string, cartItemIds: string[], onApplied: (result, code) => void, onRemoved: () => void }
// Returns:
{
  inputValue: string
  setInputValue: (v: string) => void   // auto uppercases
  isValidating: boolean
  error: string | null
  applyVoucher: () => Promise<void>    // calls applyVoucherAction, fires onApplied or sets error
  removeVoucher: () => void            // fires onRemoved, clears state
}
```

Used by: `CheckoutVoucherInput`

---

#### `features/user/checkout/hooks/useCheckoutOrgSummary.ts`

```typescript
// Props: {
//   items: CheckoutCartItem[]
//   bundleInstances: CheckoutBundleInstance[]
//   applicablePromotions: ApplicablePromotion[]
//   appliedVoucher: VoucherValidationResult | null
// }
// Returns:
{
  subtotal: number
  bestEligibleAutoPromo: ApplicablePromotion | null    // highest discount, is_eligible=true
  autoDiscount: number
  voucherDiscount: number
  totalDiscount: number
  orgTotal: number
  groupedItems: CheckoutGroupedItem[]   // bundles grouped with components nested
}

type CheckoutGroupedItem =
  | { type: 'standalone'; item: CheckoutCartItem }
  | { type: 'bundle'; instance: CheckoutBundleInstance }
```

Used by: `CheckoutOrgGroup`, `useCheckout` (for `orgSummaries`)

---

## Additional Notes for the Agent

### Computing Subtotals at Checkout

The checkout page does not use `unit_price_snapshot * quantity` for bundles. Bundle price comes from `bundles.price * cart_bundle_instances.quantity`. Standalone items use `unit_price_snapshot * quantity`.

```typescript
function computeOrgSubtotal(
  standaloneItems: CheckoutCartItem[],
  bundleInstances: CheckoutBundleInstance[],
): number {
  const itemsTotal = standaloneItems.reduce(
    (sum, item) => sum + item.unit_price_snapshot * item.quantity,
    0,
  );
  const bundlesTotal = bundleInstances.reduce(
    (sum, b) => sum + b.bundle.price * b.quantity,
    0,
  );
  return itemsTotal + bundlesTotal;
}
```

### Computing Discount Preview at Checkout

For displaying discount before placing order (in `CheckoutOrderSummary`):

```typescript
function computeDiscount(
  subtotal: number,
  promo: ApplicablePromotion | VoucherValidationResult | null,
): number {
  if (
    !promo ||
    !promo.is_eligible /* for auto */ ||
    !promo.is_valid /* for voucher */
  )
    return 0;
  if (!promo.discount_type || promo.discount_value === null) return 0;
  if (promo.discount_type === "percentage") {
    return Math.round(subtotal * (promo.discount_value / 100) * 100) / 100;
  }
  if (promo.discount_type === "fixed") {
    return Math.min(promo.discount_value, subtotal);
  }
  return 0; // free_item: no monetary discount shown
}
```

### `canPlace` validation logic in `CheckoutShell`

```typescript
const canPlace =
  orgGroups.every((org) => {
    const payment = paymentMethods[org.orgId];
    const fulfillment = fulfillmentPrefs[org.orgId];
    if (!payment) return false;
    if (fulfillment.method === "delivery" && !fulfillment.addressId)
      return false;
    return true;
  }) && !isPlacing;
```

### Redirect after successful order placement

After all orgs succeed:

```typescript
router.push("/user/orders?placed=true");
```

On the orders page, read `searchParams.placed` and show a success toast/banner on mount if `placed=true`, then clear the param via `router.replace('/user/orders')`.

### Type for cart items at checkout

Define these in `features/user/checkout/types/checkoutTypes.ts`:

```typescript
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
```

---

## Summary

| Phase              | Key Files                                                                                                                                                  | Hooks Introduced                                            | Depends On           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| 1 — Data Layer     | `queries/orders.ts`, `data/user/orders.ts`, `cache-helpers.ts`                                                                                             | —                                                           | Nothing — start here |
| 2 — Server Actions | `checkoutSchemas.ts`, `placeOrderAction.ts`, `applyVoucherAction.ts`, `cancelOrderAction.ts`, `submitPaymentProofAction.ts`, `getPaymentProofUrlAction.ts` | —                                                           | Phase 1              |
| 3 — Order History  | `/user/orders` page + components                                                                                                                           | `useOrdersPagination`, `useOrderCardActions`                | Phase 1 + 2          |
| 4 — Order Detail   | `/user/orders/[orderId]` page + components                                                                                                                 | `useOrderDetail`, `useCancelOrder`, `useGCashProofUploader` | Phase 3              |
| 5 — Checkout       | `/user/checkout` page + components                                                                                                                         | `useCheckout`, `useVoucherInput`, `useCheckoutOrgSummary`   | Phase 1 + 2          |

**Do not start Phase 2 until Phase 1 is complete and compiles cleanly.**  
**Do not start Phase 3 until Phase 2 compiles cleanly.**  
**Phases 3, 4, and 5 can be worked on in sequence after Phase 2 is done.**

---

## Hook Co-location Reference

All hooks live under `features/` alongside the components that consume them. Never define hooks in `app/` or `lib/`.

```
features/
  user/
    orders/
      hooks/
        useOrdersPagination.ts    ← Phase 3
        useOrderCardActions.ts    ← Phase 3
        useOrderDetail.ts         ← Phase 4
        useCancelOrder.ts         ← Phase 4
        useGCashProofUploader.ts  ← Phase 4
      components/
        ...
    checkout/
      hooks/
        useCheckout.ts            ← Phase 5 — main checkout state
        useVoucherInput.ts        ← Phase 5
        useCheckoutOrgSummary.ts  ← Phase 5
      components/
        ...
```

**The rule:** if a component file would need more than one `useState` or calls a Server Action, those concerns belong in a hook. The component imports the hook, destructures what it needs, and renders. Nothing more.
