export interface StoreRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  address: { street?: string; city?: string; state?: string; country?: string } | null;
  location: { latitude?: number; longitude?: number } | null;
  timezone: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  categoryId: string | null;
  managerId: string | null;
  createdAt: string;
}

export interface StoreDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  address: any;
  location: any;
  timezone: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  categoryId: string | null;
  managerId: string | null;
  operatingHours: any;
  logoUrl: string | null;
  zoneId: string | null;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}
