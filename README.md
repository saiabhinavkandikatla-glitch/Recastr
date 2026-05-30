# Recastr

Recastr is an AI creator workflow that turns one video, podcast, or blog into
30 days of platform-ready social content. The product now focuses on the core
loop: ingest a source, extract viral hooks, generate tweets, LinkedIn posts,
Reel scripts, and captions, then copy or export the pack.

The local build ships with three pre-processed demo projects, so the pitch flow
works without OpenAI, Whisper, yt-dlp, Supabase, Razorpay, or Redis credentials.

## Getting Started

```bash
npm install
copy .env.example .env.local
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or
[http://localhost:3000/dashboard](http://localhost:3000/dashboard).

## Product Surface

- Premium landing page with demo preview, workflow, outputs, testimonials, pricing, and CTA.
- Focused creator dashboard with source ingestion and Viral Hook Intelligence.
- Core generation surface for Twitter/X, LinkedIn, Instagram captions, Reel scripts, and YouTube Community posts.
- Inline editable outputs with counters, diff view, copy, approval, and tone rewrite.
- Export routes for PDF, CSV, JSON, and Notion queue placeholder.
- Razorpay order checkout and webhook handling.
- Optional schedule/calendar remains available, but no longer dominates the product.

## Production Wiring

Copy `.env.example` to `.env.local` and add service credentials. Keep
`RECASTR_DEMO_MODE=false` and `REQUIRE_AUTH=true` for live work so auth,
Postgres data, exports, scheduling, and email reminders use real services.

```bash
npm run prisma:generate
npm run prisma:push
npm run seed
```

## Useful Routes

- `/dashboard`
- `/projects/demo-founder-podcast`
- `/schedule`
- `/onboarding`
- `/settings`

API routes live under `/api/ingest/*`, `/api/generate`, `/api/tone`,
`/api/export`, `/api/schedule`, and `/api/razorpay/*`.

## Production Readiness Docs

- [Audit report](docs/01-audit-report.md)
- [Security report](docs/02-security-report.md)
- [UI redesign spec](docs/03-ui-redesign-spec.md)
- [Database and migration plan](docs/04-database-schema-and-migration.md)
- [API specification](docs/05-api-spec.md)
- [Component library](docs/06-component-library.md)
- [Roadmap](docs/07-feature-roadmap.md)
- [Monetization strategy](docs/08-monetization-strategy.md)
- [Launch checklist](docs/09-launch-checklist.md)
- [Deployment checklist](docs/10-deployment-checklist.md)
