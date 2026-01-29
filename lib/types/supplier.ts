export interface SupplierAddress {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface SupplierLink {
  id?: string;
  type: "website" | "facebook" | "instagram" | "linkedin" | "twitter" | "other";
  url: string;
  label?: string;
}

// The main entity as it exists in the database
export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  contact_number?: string | null;
  contact_email?: string | null;
  address?: SupplierAddress;
  links?: SupplierLink[];
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

// Input for creating a new supplier (omit auto-generated fields)
export interface CreateSupplierParams {
  organization_id: string;
  name: string;
  description?: string;
  contact_number?: string;
  contact_email?: string;
  address?: SupplierAddress;
  links?: SupplierLink[];
  is_archived?: boolean;
}

// Input for updating (all fields optional, except logic requirements)
export interface UpdateSupplierParams {
  name?: string;
  description?: string | null;
  contact_number?: string | null;
  contact_email?: string | null;
  address?: SupplierAddress;
  links?: SupplierLink[];
  is_archived?: boolean;
}
