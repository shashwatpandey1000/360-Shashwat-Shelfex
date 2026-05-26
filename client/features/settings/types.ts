// Local UI types for the settings feature.
// The full org response shape (OrgSettingsData) lives in OrgSettings.tsx as a private interface.

export interface OrgSettingsFormData {
  name: string;
  website?: string;
  contactPhone?: string;
  country: string;
  currency: string;
  timezone: string;
  defaultLanguage: string;
  industryId?: string;
  hqAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    formattedAddress?: string;
    lat?: number;
    lng?: number;
  };
}
