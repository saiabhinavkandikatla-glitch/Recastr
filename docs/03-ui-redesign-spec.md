# UI redesign specification

## Product direction

Recastr should feel like an AI content command center, not an enterprise dashboard. The generated content and viral hooks should be the hero of the interface.

## Brand principles

- Fast: source to usable copy in under one minute for demos.
- Focused: one source, many native assets.
- Premium: dark surfaces, subtle gradients, high whitespace discipline.
- Creator-native: hooks, posts, captions, and previews are more important than admin widgets.

## Visual language

Inspired by:
- Linear for information density and keyboard-first surfaces.
- Vercel for contrast and crisp typography.
- Notion AI for editing confidence.
- Stripe for pricing clarity.
- Arc for premium dark gradients.

Core palette:
- Background: `#030712`
- Surface: `#0F172A`
- Primary: `#7C3AED`
- Accent: `#14B8A6`
- Text: slate scale through Tailwind tokens

Typography:
- UI: Inter
- Generated content: JetBrains Mono
- Emphasis: font weight 500
- Avoid oversized card headings inside compact panels.

## Landing page

Required sections:
- Sticky navbar
- Hero: "One video. 30 content assets."
- Problem statement
- How it works
- Viral Hook Intelligence
- AI output showcase
- Testimonials
- Pricing
- FAQ
- Final CTA

Primary CTA:
- "Start free"

Secondary CTA:
- "Watch demo"

Conversion improvements:
- Add sample output streaming animation in hero.
- Add pricing CTA tracking.
- Add a "paste a URL" demo input above the fold.

## Dashboard

Recommended structure:
- Left sidebar with Dashboard, Projects, Schedule, Settings.
- Top bar with search, notifications, avatar.
- Primary hero: quick source ingest.
- Viral Hook Intelligence preview.
- Lightweight usage and time-saved metrics.

Avoid:
- Large content library blocks.
- Dense project tables on first screen.
- Too many charts before real analytics exists.

## Project workspace

Recommended structure:
- Left: source metadata, platform filters, top hooks.
- Middle: generated content list.
- Right: editor, actions, phone preview.

Primary actions:
- Copy
- Approve
- Tone rewrite
- Preview
- Export

UX requirements:
- Preview updates from textarea changes immediately.
- Hook buttons generate content on-page.
- Copy actions always show toast feedback.
- Export downloads real files.

## Mobile behavior

- Dashboard: source ingest first, metrics collapsed below.
- Project: content list first, detail editor as a sheet/drawer in a future pass.
- Phone preview can be toggled but should not block editing.
- Scheduler should become list-first on mobile.

## Accessibility

- All buttons require discernible text or aria-label.
- Focus states use `focus-visible:ring-2`.
- Dark mode contrast must remain AA or better.
- Interactive chips should be buttons, not divs.

## Animation rules

- Use Framer Motion for preview transitions and page-level reveals.
- Use Tailwind `animate-streamIn` for generated cards.
- Avoid constant decorative movement near editors.
- Loading states should describe progress instead of spinning.
