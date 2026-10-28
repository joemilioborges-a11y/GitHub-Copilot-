# JOBS Firestore Security Specification (Phase 0 — Security-First TDD)

## 1. Data Model & PII Segregation

| Collection Path | Entity Schema | PII Classification | Access Model |
| :--- | :--- | :--- | :--- |
| `/users/{userId}` | `UserPublicProfile` | Public Only (`uid`, `displayName`, `handle`, `avatarUrl`, `bio`, `createdAt`, `updatedAt`) | Signed-in read; owner create/update; owner or admin delete |
| `/users/{userId}/private/{docId}` | `UserPrivateInfo` | Private PII (`uid`, `email`, `createdAt`, `updatedAt`) | Owner or Admin read/write only (`docId == 'profile'`) |
| `/admin_audit_logs/{eventId}` | `AdminAuditRecord` | Administrative Audit Trail | Verified Admin read & append-only create; **Immutable** (`update: false`, `delete: false`) |
| `/ledger_entries/{entryId}` | `LedgerSnapshot` | Double-Entry Financial Ledger | Verified Admin or Actor read; **Verified Admin ONLY** append-only create; **Immutable** (`update: false`, `delete: false`) |
| `/payout_records/{payoutId}` | `PayoutSnapshot` | Authoritative Production Payout Record | Verified Admin or Creator read; Creator can create `under_review` (`amountCents >= 5000`); Admin only can update state transitions (`delete: false`) |
| `/psp_webhook_events/{eventId}` | `PspWebhookEventSnapshot` | Cryptographic Webhook Receipt | Verified Admin read & append-only create; **Immutable** (`update: false`, `delete: false`) |
| `/media_items/{mediaId}` | `ProtectedMediaItem` | Creator Content Metadata | Approved read or Owner/Admin read; Creator create/update forced to `moderationStatus == 'pending'`; Admin only can set `'approved'`/`'rejected'` |
| `/admins/{adminId}` | Admin Role Marker | System RBAC | Admin read/write only |

## 2. Core Data Invariants
1. **Default Deny:** `match /{document=**} { allow read, write: if false; }` at the root.
2. **Closed-World Key Whitelisting:** Every `create` and `update` strictly enforces `request.resource.data.keys().hasAll(...)` and `request.resource.data.keys().hasOnly(...)` to block mass-assignment and undocumented fields.
3. **Strict Type & Bounds Checking:**
   - All string fields enforce `is string` and explicit `.size() >= min && .size() <= max`.
   - All timestamps enforce `is timestamp`, `createdAt == request.time` on creation, and `createdAt == resource.data.createdAt` on updates.
   - Numeric fields (`amountCents`) enforce `is int`, `> 0`, and `<= 100000000` (anti-overflow).
4. **Immutability:**
   - Primary keys (`uid`, `eventId`, `entryId`) and `createdAt` cannot be mutated after creation.
   - `/admin_audit_logs/{eventId}` and `/ledger_entries/{entryId}` are strictly append-only (`allow update, delete: if false;`).
5. **Bootstrapped RBAC (`isAdmin()`):**
   - Verified admin email (`joemilioborges@gmail.com` with `email_verified == true`) or existence of `/databases/$(database)/documents/admins/$(request.auth.uid)`.

## 3. "Dirty Dozen" Attack Payloads (Red Team Verification)
1. **Unauthenticated Read/Write:** Blocked by `isSignedIn()` on all paths.
2. **Horizontal Privilege Escalation (`/users/victim/private/profile`):** Blocked by `isOwner(userId) || isAdmin()`.
3. **PII Leak in Public Profile:** `email` is rejected by `hasOnly(['uid', 'displayName', 'handle', 'avatarUrl', 'bio', 'createdAt', 'updatedAt'])` on `/users/{userId}`.
4. **Privilege Escalation (`role: 'admin'` injection on `/users/{userId}`):** Blocked by `hasOnly(...)` and dedicated `/admins/{adminId}` collection controlled solely by `isAdmin()`.
5. **Audit Trail Tampering (`update` or `delete` on `/admin_audit_logs/{eventId}`):** Blocked by `allow update, delete: if false;`.
6. **Ledger Entry Deletion or Mutation:** Blocked by `allow update, delete: if false;` on `/ledger_entries/{entryId}`.
7. **Timestamp Forgery (backdating `createdAt`):** Blocked by `request.resource.data.createdAt == request.time`.
8. **Ownership Hijacking on Update (`uid` mutation):** Blocked by `request.resource.data.uid == resource.data.uid`.
9. **Storage Bomb (1MB string payload):** Blocked by strict `.size() <= max` bounds on every string field.
10. **Negative or NaN Ledger Amount:** Blocked by `data.amountCents is int && data.amountCents > 0 && data.amountCents <= 100000000`.
11. **Malformed Hash Chain (`eventHash` not 64 hex chars):** Blocked by `.matches('^[a-f0-9]{64}$')`.
12. **Path-Data ID Mismatch (`docId != data.eventId`):** Blocked by `request.resource.data.eventId == eventId` and `request.resource.data.uid == userId`.
