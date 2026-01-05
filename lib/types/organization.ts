export interface Organization {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  description: string;
  logoUrl?: string;
  isVerified: boolean;
  commissionRate: number;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt?: string;
  status: "active" | "inactive" | "pending";
}

export type OrganizationStatus = Organization["status"];

export type CreateOrganizationData = Omit<
  Organization,
  "id" | "createdAt" | "totalOrders" | "totalRevenue" | "updatedAt"
>;

export type UpdateOrganizationData = Partial<
  Omit<Organization, "id" | "createdAt" | "totalOrders" | "totalRevenue">
>;
