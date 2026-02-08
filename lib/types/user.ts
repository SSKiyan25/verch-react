export interface User {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string | null;
  role:
    | "customer"
    | "organization_admin"
    | "organization_manager"
    | "organization_staff"
    | "admin";
  contact_number?: string | null;
  is_verified: boolean;
  has_agreed_to_terms: boolean;
  has_changed_default_password?: boolean;
  created_at: string;
  updated_at: string;
  organization_id?: string | null;
}

export interface CreateUserData {
  full_name: string;
  email?: string;
  password: string;
  role: User["role"];
  contact_number?: string;
  organization_id?: string;
}
