# Onboarding Feature

## 1. Overview
Multi-step organization registration flow for first-time users. Guides new org admins through
providing org details, which are submitted to create a pending org record. After submission,
the user waits for super-admin approval before accessing the main dashboard.

## 2. File Map
| File | Responsibility |
|------|---------------|
| components/OnboardingFlow.tsx | Main multi-step registration form |
| components/StepRail.tsx | Step progress indicator sidebar |
| components/OnboardingPending.tsx | Waiting-for-approval screen |
| components/OnboardingRejected.tsx | Rejection notification screen |
| mutations.ts | Org registration mutations (defers to settings/api when available) |
| types.ts | OnboardingStep |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `OnboardingFlow`, `StepRail`, `OnboardingPending`, `OnboardingRejected`

## 4. Core Rules & Edge Cases
- Onboarding is only shown when user has no org or org status is `pending` / `rejected`
- Step progress is local state — not persisted until final submission
- After submission, user is redirected to `/onboarding/pending`; middleware polls org status
- If org is `rejected`, user lands on `/onboarding/rejected` and can re-apply
- The middleware handles routing: active orgs bypass onboarding, pending orgs land on pending page
