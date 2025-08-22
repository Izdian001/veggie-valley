# Veggie Valley

A Next.js + Supabase app for a marketplace between buyers and sellers.

## Quick Start

1) Install dependencies
```
npm install
```

2) Environment configuration
- Copy `.env.example` to `.env.local` and fill in your Supabase project values.
```
cp .env.example .env.local
```
- Required variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3) Database setup (Supabase SQL Editor)
- If your project does not yet have the reviews/messaging tables, run:
  - `reviews_and_messaging_schema.sql`
- Apply policies and helpers (RLS, reviewer_id trigger, aggregates, public product reads):
  - `reviews_policies_update.sql`

4) Run the app
```
npm run dev
```

## Notes
- The products page shows only approved/active products by default. Ensure your products have `is_approved=true` or `status='active'`.
- Reviews can be submitted by buyers regardless of delivery status (policy controlled in `reviews_policies_update.sql`).
- Seller store page computes live rating and review count from `reviews`.

## Do not commit secrets
- `.env.local` is ignored by Git. Never commit real keys. Use `.env.example` as a template.
