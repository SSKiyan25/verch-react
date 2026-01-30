// ==========================================
// 2. CENTRALIZED KEYS (The "Single Source of Truth")
// ==========================================
export const CACHE_KEYS = {
  // --- ORGANIZATIONS ---
  organizations: {
    byId: (id: string) => ["organizations", id],
    // For listing public organizations (if you have a directory)
    public: () => ["organizations", "public"],
  },

  // --- USERS ---
  users: {
    byId: (id: string) => ["users", id],
    // Users belonging to an org (Staff list)
    byOrg: (orgId: string) => ["organizations", orgId, "users"],
  },

  // --- PRODUCTS ---
  products: {
    byId: (id: string) => ["products", id],
    // Storefront view often fetches by Slug (if you add slug later) or ID
    // List of products for an Organization
    byOrg: (orgId: string) => ["organizations", orgId, "products"],
    // List of products by Supplier (for filtering)
    bySupplier: (supplierId: string) => ["suppliers", supplierId, "products"],
    // Products by Category
    byCategory: (catId: string) => ["categories", catId, "products"],
  },

  // --- VARIATIONS ---
  variations: {
    // You rarely fetch a single variation in isolation, usually context of a product
    byId: (id: string) => ["variations", id],
    // The most common fetch: "Get me all variations for Product X"
    byProduct: (prodId: string) => ["products", prodId, "variations"],
  },

  // --- CATEGORIES ---
  categories: {
    byId: (id: string) => ["categories", id],
    bySlug: (slug: string) => ["categories", "slug", slug],
    // Global categories (where organization_id is NULL)
    global: () => ["categories", "global"],
    // Custom categories for a specific Org
    byOrg: (orgId: string) => ["organizations", orgId, "categories"],
    // Sub-categories
    byParent: (parentId: string) => ["categories", parentId, "children"],
  },

  // --- SUPPLIERS ---
  suppliers: {
    byId: (id: string) => ["suppliers", id],
    byOrg: (orgId: string) => ["organizations", orgId, "suppliers"],
  },

  // --- STOCK LOGS (Optional - high churn) ---
  stockLogs: {
    byProduct: (prodId: string) => ["products", prodId, "stock-logs"],
  },
};
