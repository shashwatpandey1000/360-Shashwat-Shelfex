# Zones Feature

## 1. Overview
Manages geographic zone hierarchy UI within an org. Zones sit between orgs and stores;
zone managers have data access limited to their assigned zones. The zones page lives under
the stores section in the dashboard (/dashboard/stores/zones).

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: list, create, update, delete |
| queries.ts | useZonesQuery, useAllZonesQuery, useZoneByIdQuery |
| mutations.ts | useCreateZoneMutation, useUpdateZoneMutation, useDeleteZoneMutation |
| types.ts | ZoneRow interface |
| components/ZoneList.tsx | Zone table with add/edit/delete actions |
| components/AddZoneDialog.tsx | Create zone modal |
| components/EditZoneDialog.tsx | Edit zone modal |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** ZoneList, AddZoneDialog, EditZoneDialog, useZonesQuery, useAllZonesQuery, useZoneByIdQuery, useCreateZoneMutation, useUpdateZoneMutation, useDeleteZoneMutation, zonesApi

## 4. Core Rules & Edge Cases
- Zones are org-scoped; orgId comes from the auth context, not from user input
- Zone name must be unique within an org (enforced server-side; surface error to user)
- Deleting a zone with assigned stores shows a warning
- Parent zone selection in edit mode excludes the zone itself and all its descendants to prevent circular references
