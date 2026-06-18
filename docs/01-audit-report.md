# Recastr production audit report

## Executive summary

Recastr is now positioned around one core promise: turn one long-form source into a platform-ready content pack. The current codebase has strong foundations: Next.js App Router, Supabase auth, Prisma, deterministic demo data, Razorpay, reusable project workspace components, and a working source-to-content demo flow.

The main production risks found in this audit were not visual polish alone. They were live/demo mode confusion, incomplete authorization checks, inconsistent API error handling, missing tenant/audit primitives, and scattered product surfaces that made the core workflow feel heavier than it needs to be.

## Critical fixes implemented

- Separated explicit demo mode from local development auth fallback.
- Removed `demo-user` as a reason for live API routes to return demo data.
- Added production env validation for Supabase URL, anon key, database URL, and direct URL when demo mode is off.
- Added guardrails that fail production startup if server secrets are accidentally prefixed with `NEXT_PUBLIC_`.
- Added a secret scanner at `npm run security:scan`.
- Added multi-tenant models, role fields, and audit logs to Prisma.
- Added content ownership validation before scheduling.
- Added audit logging for project creation, scheduling, and Razorpay order creation.
- Added stored-project retrieval to project API detail routes so locally generated YouTube projects resolve correctly.
- Restored the high-fidelity phone preview into the project workspace.

## Page audit

### `/`

Purpose: Convert visitors into users with a concise AI creator workflow pitch.

Problems found:
- The landing page is visually stronger than early app screens, but product proof should be tied more directly to the in-app demo.
- Pricing and demo CTAs need analytics instrumentation before launch.

Recommended improvements:
- Add a 60-second embedded product walkthrough.
- Add real creator testimonials after beta usage.
- Add conversion tracking for hero CTA, pricing CTA, demo modal, and FAQ expansion.

### `/login` and `/signup`

Purpose: Authenticate users with Supabase email/password and OAuth.

Problems found:
- Demo/local auth fallback can hide setup mistakes if production envs are incomplete.
- OAuth redirect behavior should be tested after Supabase URL allow-list updates.

Recommended improvements:
- Keep field-level zod validation.
- Add explicit toast if Google OAuth is unavailable.
- Add password reset flow before launch.

### `/onboarding`

Purpose: Capture creator type, platforms, tone, and first source.

Problems found:
- The wizard is good for demos but should persist partial progress for real users.
- First-source ingestion should display exact failure reasons.

Recommended improvements:
- Save draft onboarding state to localStorage.
- Create the first project through `/api/ingest/url` or `/api/ingest/text`.
- Track funnel events: started, step completed, source pasted, project created.

### `/dashboard`

Purpose: Home base for quick ingest and high-level content workflow.

Problems found:
- Earlier content library duplication distracted from the core source-to-pack workflow.
- Analytics widgets are mostly illustrative.

Fixes implemented:
- Content library removed from the primary dashboard.
- Quick ingest and Viral Hook Intelligence are now the center of the experience.

Recommended improvements:
- Add recent projects only after ingestion volume exists.
- Add usage meter and upgrade prompt once billing is live.

### `/projects/[id]`

Purpose: Main content studio for hooks, generated assets, editing, preview, copy, and export.

Problems found:
- The phone preview was built but not mounted.
- Hook buttons rendered as buttons but did not perform useful work.
- Old YouTube fallback hooks were generic.

Fixes implemented:
- Phone preview restored and tied to selected/edited content.
- Hook generation button now creates X, LinkedIn, Instagram, and YouTube Community assets.
- YouTube fallback hooks are title-aware.

Recommended improvements:
- Persist edits through a PATCH content API.
- Add keyboard shortcuts for copy, approve, and regenerate.
- Add version history.

### `/projects/[id]/hooks`

Purpose: Dedicated Viral Hook Intelligence view.

Problems found:
- Useful but secondary; it should link clearly back to content generation.

Recommended improvements:
- Add "Generate from this hook" deep link to `/projects/[id]/generate?hookId=...`.
- Add hook type education only in tooltips, not page copy.

### `/projects/[id]/generate`

Purpose: Advanced generation control panel.

Problems found:
- It overlaps with the project workspace hook generation.

Recommended improvements:
- Keep it as an advanced batch generation surface.
- Make the workspace the default creation surface.
- Add job progress polling for full 30-asset generation.

### `/schedule`

Purpose: Calendar and queue for approved content.

Problems found:
- Scheduling can dominate the product before the core content workflow is proven.
- Existing API needed ownership validation.

Fixes implemented:
- Scheduling now verifies content ownership before creating scheduled posts.

Recommended improvements:
- Keep scheduler behind Pro/Team plans.
- Add simple list mode for mobile.

### `/settings`

Purpose: Account, integrations, billing, notifications.

Problems found:
- Good SaaS structure, but integrations are not fully operational yet.

Recommended improvements:
- Mark integration cards as "coming soon" unless OAuth credentials exist.
- Add usage bars by plan.
- Add invoice history after Razorpay webhook is verified in production.

## User journey map

1. Visitor sees the promise: one source becomes a content pack.
2. Visitor starts free or opens demo.
3. User signs up or continues in demo mode.
4. User chooses creator type, platforms, and tone.
5. User pastes YouTube/blog URL or raw text.
6. Recastr extracts metadata/transcript and hook intelligence.
7. User clicks a hook or generated asset.
8. User edits copy, previews it in a platform phone frame, then copies/exports.
9. Power users schedule approved pieces or upgrade for higher limits.

## Feature map

Core:
- Source ingestion
- Transcript/text processing
- Viral Hook Intelligence
- Content generation
- Inline editing
- Platform preview
- Copy/export
- Usage tracking

Secondary:
- Scheduling
- Connected accounts
- Billing
- Team workspaces
- Analytics

Deferred:
- Instagram publishing
- Notion export automation
- Full collaboration comments
- Engagement analytics sync

## Navigation map

- Marketing: `/`
- Auth: `/login`, `/signup`
- Activation: `/onboarding`
- Workspace: `/dashboard`
- Content studio: `/projects/[id]`
- Hook intelligence: `/projects/[id]/hooks`
- Advanced generation: `/projects/[id]/generate`
- Scheduling: `/schedule`
- Account and billing: `/settings`

## Information architecture

Primary app object: `Project`

Project contains:
- Source metadata
- Transcript or source text
- Summary intelligence
- Viral hooks
- Generated content pieces
- Scheduled post records

User contains:
- Auth identity
- Creator profile
- Plan and limits
- Team/workspace memberships
- Brand voice profiles
- Usage and audit events

## Duplication and dead surface recommendations

Remove or consolidate:
- Duplicate old editor output tabs once the new project workspace fully covers generation.
- Legacy `/api/ingest/youtube`, `/api/ingest/blog`, and `/api/ingest/podcast` should become wrappers around `/api/ingest/url` and `/api/ingest/text`.
- Old output card components should be kept only if still used by legacy demo pages.

Keep:
- `ProjectWorkspace` as the main product surface.
- `PlatformPreviewEngine` as the premium preview feature.
- `ViralHookIntelligence` as the signature differentiator.
