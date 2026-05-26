export interface ZoneRow {
  id: string;
  orgId: string;
  parentZoneId: string | null;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
