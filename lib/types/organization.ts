/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Organization {
  // Core Information
  id: string;
  name: string;
  contact_email: string; // matches DB: contact_email
  phone_number: string | null; // matches DB: phone_number
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  address_images_url: { url: string; path: string }[]; // matches DB: address_images_url
  search_keywords: string[]; // matches DB: search_keywords

  // Representations
  logo_image_url: string; // matches DB: logo_image_url
  logo_image_path: string; // matches DB: logo_image_path
  cover_image_url: string; // matches DB: cover_image_url
  cover_image_path: string; // matches DB: cover_image_path
  description: string;
  images_url: { url: string; path: string }[]; // matches DB: images_url

  // Business Settings (stored as JSONB in DB)
  settings: {
    businessHours: {
      [day: string]: {
        isOpen: boolean;
        openTime?: string;
        closeTime?: string;
      };
    };
    commissionRate: number;
    autoAcceptOrders: boolean;
    requireOrderApproval: boolean;
  };

  // Financials (simplified, matching your DB structure)
  total_paid: number; // matches DB: total_paid (numeric)
  total_due: number; // matches DB: total_due (numeric)
  last_payment_date: Date | null; // matches DB: last_payment_date
  payment_method: string; // matches DB: payment_method

  // Timestamps
  date_created: Date; // matches DB: date_created
  last_modified: Date; // matches DB: last_modified

  // Status & Verifications
  status:
    | "draft"
    | "pending_verification"
    | "active"
    | "suspended"
    | "archived";
  is_public: boolean; // matches DB: is_public
  is_setup_complete: boolean; // matches DB: is_setup_complete
  is_verified: boolean; // matches DB: is_verified

  // Verification details (stored as JSONB in DB)
  verification: {
    submittedAt?: Date;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
  };
}

// For creating new organizations (partial interface)
export interface CreateOrganizationData {
  name: string;
  contact_email: string;
  phone_number?: string;
  description?: string;
  address?: Partial<Organization["address"]>;
  settings?: Partial<Organization["settings"]>;
}

// For updating organizations (all fields optional except id)
export interface UpdateOrganizationData
  extends Partial<Omit<Organization, "id">> {
  id: string;
}

// Database row type (what comes directly from Supabase)
export interface OrganizationRow {
  id: string;
  name: string;
  contact_email: string;
  phone_number: string | null;
  address: any; // JSONB
  address_images_url: any; // JSONB
  search_keywords: string[] | null;
  logo_image_url: string | null;
  logo_image_path: string | null;
  cover_image_url: string | null;
  cover_image_path: string | null;
  description: string | null;
  images_url: any; // JSONB
  settings: any; // JSONB
  total_paid: number | null;
  total_due: number | null;
  last_payment_date: string | null; // ISO string from DB
  payment_method: string | null;
  date_created: string | null; // ISO string from DB
  last_modified: string | null; // ISO string from DB
  status:
    | "draft"
    | "pending_verification"
    | "active"
    | "suspended"
    | "archived"
    | null;
  is_public: boolean | null;
  is_setup_complete: boolean | null;
  is_verified: boolean | null;
  verification: any; // JSONB
}

// Helper function to transform DB row to Organization interface
export function transformOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    contact_email: row.contact_email,
    phone_number: row.phone_number || "",
    address: row.address || {},
    address_images_url: row.address_images_url || [],
    search_keywords: row.search_keywords || [],
    logo_image_url: row.logo_image_url || "",
    logo_image_path: row.logo_image_path || "",
    cover_image_url: row.cover_image_url || "",
    cover_image_path: row.cover_image_path || "",
    description: row.description || "",
    images_url: row.images_url || [],
    settings: row.settings || {
      businessHours: {},
      commissionRate: 0,
      autoAcceptOrders: false,
      requireOrderApproval: true,
    },
    total_paid: row.total_paid || 0,
    total_due: row.total_due || 0,
    last_payment_date: row.last_payment_date
      ? new Date(row.last_payment_date)
      : null,
    payment_method: row.payment_method || "",
    date_created: new Date(row.date_created || new Date()),
    last_modified: new Date(row.last_modified || new Date()),
    status: row.status || "draft",
    is_public: row.is_public || false,
    is_setup_complete: row.is_setup_complete || false,
    is_verified: row.is_verified || false,
    verification: row.verification || {},
  };
}

// Type for organization status enum
export type OrganizationStatus = Organization["status"];
