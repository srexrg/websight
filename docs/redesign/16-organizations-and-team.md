# 16 - Organizations & Team Management

> **Context**: WebSight tenancy is flat: `users` 1-N `domains`, ownership enforced by `user_id` filters; no teams, roles, or invitations. Rybbit verifies "organizations support" in its README and prices team seats (Standard: 3 team members; Pro: unlimited) - orgs are also its billing container. Auth is Supabase (Google OAuth only). The `02` plan introduces `sites.org_id` expecting this plan.

## Overview

Introduce organizations as the ownership and billing boundary: every site belongs to an org, users belong to orgs with roles, and personal accounts are just single-member orgs (auto-created, invisible until needed). This unblocks team seats (pricing lever per `18`), agency use-cases, and safe sharing of dashboards internally - without building enterprise RBAC (which did not verify even for Rybbit).

## Feature breakdown

- **Model**: `orgs` -> `org_members` (role: owner / admin / member / viewer) -> `sites`. Auto-provision a personal org at first login; UI hides org machinery for single-member orgs (zero added friction for indie users - the majority).
- **Roles** (deliberately simple):
  - *Owner*: everything incl. billing, org deletion, transfers (exactly one; transferable).
  - *Admin*: manage sites, members (not billing), all site settings.
  - *Member*: full read + manage goals/funnels/segments/share links.
  - *Viewer*: read-only dashboards.
- **Org screens**: org switcher in the sidebar user area (`03`); `/org/settings` - name, slug; `/org/members` - list with roles, invite by email, pending invites (resend/revoke), remove member, change role; `/org/sites` - move site between orgs (owner of both).
- **Invitations**: email invite with token link; invitee signs in with Google and lands in the org; invites expire after 7 days; role preselected by inviter.
- **Site-level integration**: all queries scope by org membership instead of `user_id`; segments' "site" visibility (`05`), goals/funnels CRUD, share settings (`15`) become role-gated.
- **Small details**: audit trail of member/role changes (append-only table, surfaced later); "leave org" self-service; deleting the last owner is impossible.

## UI/UX considerations

- Single-member experience must not regress: no org name prompts at signup, no switcher until a second org/member exists.
- Invites must work for users who have never signed up (invite -> OAuth -> auto-join, no dead ends); show clear pending state on both sides.
- Role changes take effect immediately (session-independent checks server-side).
- Destructive actions (remove member, delete org) get typed-confirmation dialogs.

## Technical approach

- Supabase RLS becomes the enforcement layer: policies on `sites` and all site-scoped tables via `exists (select 1 from org_members where org_id = sites.org_id and user_id = auth.uid())` with role checks for writes; server code additionally checks roles for defense in depth (`requireRole(siteId, 'admin')` helper).
- Migration: create a personal org per existing user, move their `domains`->`sites` rows into it - part of the `02` migration sequence.
- Invitations: `org_invites` table + email via Resend; token single-use, hashed at rest.
- Email sending infra introduced here is shared with `19` (digests) - build it as `lib/email/` (Resend client + React Email templates) from the start.

## Frontend implementation

- `app/(app)/org/{settings,members}/page.tsx`; `components/org/{org-switcher,members-table,invite-dialog,role-select}.tsx`; sidebar user menu gains the switcher; site-settings pages gain role-aware disabled states.

## Backend implementation

- Org/member/invite CRUD route handlers with `requireRole`; `getSiteForUser` (from `03`) replaced by org-membership resolution; RLS policy migrations; audit-log inserts on membership mutations.

## Database changes

```sql
orgs(id uuid pk, name text, slug text unique, is_personal bool default false, created_at)
org_members(org_id uuid, user_id uuid, role text check (role in ('owner','admin','member','viewer')),
            created_at, pk (org_id, user_id))
org_invites(id uuid pk, org_id uuid, email text, role text, token_hash text, invited_by uuid,
            expires_at timestamptz, accepted_at timestamptz, created_at)
org_audit_log(id bigint identity, org_id uuid, actor_id uuid, action text, target jsonb, created_at)
alter table sites add column org_id uuid references orgs not null; -- backfilled
```

## API requirements

- `GET/PATCH /api/orgs/:id`; `GET/POST/DELETE /api/orgs/:id/members`; `PATCH /api/orgs/:id/members/:userId` (role); `POST /api/orgs/:id/invites`, `POST /api/invites/:token/accept`; `POST /api/sites/:id/transfer`.

## Dependencies

- `resend` + `@react-email/components` (new - shared with `19`). Requires `02`'s `sites` table.

## Edge cases

- Invite to an email that later signs in with a different Google account email (match on verified email at accept time; mismatch shows explanation); user in N orgs with same-named sites (routes use site `public_id`, safe); org deletion with active sites (require moving/deleting sites first); concurrent role changes (last-write-wins, audit-logged); RLS recursion pitfalls (org_members policies must not self-reference - use security-definer helper function); Supabase auth email as identity while only Google OAuth exists (adding email/password later must keep org membership keyed to user id, already true).

## Development milestones

1. Schema + personal-org backfill + RLS policies + membership resolution replacing `user_id` checks (invisible change).
2. Org switcher + settings + members table (no invites: direct add by existing account email).
3. Email infra (`lib/email/`) + invitations end-to-end.
4. Role-gating across site features (segments/goals/share/settings) + audit log.
5. Site transfer + org deletion flows.

## Future improvements

- Per-site member scoping within an org (agency: client sees only their site) - the real RBAC ask; SSO/SAML (enterprise, someday); org-level default preferences (timezone, week start); 2-person approval for destructive org actions.
