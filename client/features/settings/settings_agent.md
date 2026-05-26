# Settings Feature

## 1. Overview
Manages organization settings UI: name, industry, address, logo, and feature modules.
This feature also owns the raw `orgApi` which is consumed by the onboarding feature for
org registration. Settings changes take effect immediately after save.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: register, getSettings, updateSettings; also used by onboarding |
| queries.ts | useOrgSettingsQuery |
| mutations.ts | useRegisterOrgMutation, useUpdateOrgSettingsMutation |
| types.ts | Local UI form types (OrgSettingsFormData) |
| components/OrgSettings.tsx | Settings form: org name, industry, address, regional, theme, info |
| index.ts | Public exports including `orgApi` for cross-feature use |

## 3. Public Contract
**Exports:** `OrgSettings`, `useOrgSettingsQuery`, `useRegisterOrgMutation`, `useUpdateOrgSettingsMutation`, `orgApi`, `OrgSettingsFormData`
**Cross-feature consumers:** `features/onboarding` imports `orgApi` from this feature

## 4. Core Rules & Edge Cases
- `orgApi` is exported from index.ts because the onboarding feature needs `orgApi.register()`
- Org industry and name cannot be changed after approval (enforce on server; surface error on client)
- Settings page is only accessible to users with `settings:write` permission
- Theme preference is stored in browser local storage (not persisted server-side)
