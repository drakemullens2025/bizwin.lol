# bizwin.lol

An AI-powered entrepreneurship education platform that teaches e-commerce through hands-on dropshipping with CJ Dropshipping. Students learn by doing — building real stores, sourcing products, completing business scenarios, and competing on leaderboards.

**Live at [bizwin.lol](https://bizwin.lol)**

## Tech Stack

- **Framework**: Next.js 16 (React 19, App Router, Turbopack)
- **Language**: TypeScript
- **Auth**: Stack Auth (`@stackframe/stack`)
- **Database**: Supabase (PostgreSQL with RLS)
- **AI**: OpenRouter (DeepSeek models) for evaluation, scenario generation, and business analysis
- **Supplier API**: CJ Dropshipping API v2 (product sourcing, inventory, orders)
- **Hosting**: Netlify with `@netlify/plugin-nextjs`

## Project Structure

```
app/
├── app/
│   ├── page.tsx                 # Landing page (robots2.png hero, pitch sections)
│   ├── (platform)/              # Authenticated app pages
│   │   ├── dashboard/           # Main dashboard with stats overview
│   │   ├── learn/[tier]/        # Scenario-based learning (Tiers 0-3)
│   │   ├── catalog/             # CJ product search & sourcing
│   │   ├── stores/              # Multi-store manager
│   │   ├── stores/new/          # Store creation wizard with templates
│   │   ├── store/products/      # Product management
│   │   ├── store/orders/        # Order management
│   │   ├── store/setup/         # Store configuration
│   │   ├── intelligence/        # Supply chain intelligence dashboard
│   │   ├── analytics/           # Business & learning analytics
│   │   ├── leaderboard/         # XP leaderboard
│   │   ├── challenges/          # Weekly/monthly challenges
│   │   └── cohorts/             # Classroom cohorts & educator dashboard
│   ├── api/                     # 40 API routes
│   │   ├── ai/                  # AI endpoints (evaluate, chat, generate-scenario, calibrate, advisors)
│   │   ├── analytics/           # Store & learning analytics, AI review, CSV export
│   │   ├── cj/                  # CJ Dropshipping (products, categories, inventory)
│   │   ├── cohorts/             # Cohort CRUD, members, leaderboard, alerts, export, curriculum
│   │   ├── intelligence/        # Trends, margins, shipping, AI review
│   │   ├── store/               # Single-store CRUD, products, orders
│   │   ├── stores/              # Multi-store management
│   │   └── ...                  # Challenges, leaderboard, portfolio, progress, XP
│   └── store/[slug]/            # Public storefront (premium template)
├── data/
│   ├── commerce-scenarios.ts    # Tier 0 scenarios (20) + tier routing
│   ├── tier1-scenarios.ts       # Tier 1 Builder scenarios (15)
│   ├── tier2-scenarios.ts       # Tier 2 Operator scenarios (15)
│   ├── tier3-scenarios.ts       # Tier 3 Scale scenarios (10)
│   └── store-templates.ts       # 5 white-label store templates
├── lib/
│   ├── supabase.ts              # Database helpers (service client + all queries)
│   ├── cj-client.ts             # CJ Dropshipping API client (serverless-safe token cache)
│   └── xp.ts                    # XP/leveling system
├── db/
│   ├── schema.sql               # Base database schema
│   └── frontier-schema.sql      # Frontier features schema (4.2-4.6)
└── package.json
```

## Features

### Learning System
- **60 static scenarios** across 4 tiers (Foundation, Builder, Operator, Scale)
- **AI-generated scenarios** personalized to each student's store, weaknesses, and progress
- **AI evaluation** with rubric-based scoring across 4 dimensions per scenario type
- **Difficulty calibration** that recommends tier and difficulty based on performance

### Commerce
- **CJ Dropshipping integration** — search 400K+ products, check inventory, place orders
- **Multi-store support** — create multiple stores from 5 white-label templates
- **Premium public storefronts** at `/store/[slug]` with animated product cards, image galleries, polished cart/checkout
- **Supply chain intelligence** — trending products, margin analysis, shipping estimates, AI lineup review
- **AI product advisor** — viability scoring, margin analysis, competition assessment

### Gamification
- **XP & leveling** system with level-up tracking
- **Global & cohort leaderboards**
- **Weekly/monthly challenges** with progress tracking
- **Cohorts** for classroom use with join codes

### Educator Tools
- **Educator dashboard** with student drill-down, scores, XP timeline
- **Struggling student alerts** (inactive >7 days, avg score <40)
- **CSV export** of cohort performance data
- **Curriculum configuration** per cohort (enabled tiers, required scenarios)

### Analytics
- **Store performance** — revenue by day, product performance, period comparison
- **Learning progress** — scores over time, dimension averages, tier progress
- **AI business review** — automated grade (A-F) with recommendations
- **CSV export** for orders, products, and summaries

## Setup

### Prerequisites
- Node.js 18+
- Supabase project
- Stack Auth project
- OpenRouter API key
- CJ Dropshipping API credentials

### Environment Variables

Create `app/.env.local`:

```env
# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_client_key
STACK_SECRET_SERVER_KEY=your_server_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter (AI)
OPENROUTER_API_KEY=your_openrouter_key

# CJ Dropshipping
CJ_API_EMAIL=your_cj_email
CJ_API_KEY=your_cj_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

Run the SQL files in Supabase SQL Editor in order:
1. `db/schema.sql` — base tables (user_profiles, stores, scenarios, XP, challenges, cohorts)
2. `db/frontier-schema.sql` — frontier tables (generated_scenarios, product_events, store_templates, analytics_snapshots, kv_store)

### Install & Run

```bash
cd app
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Deploy to Netlify

The repo includes `netlify.toml` at the root with `base = "app"`. Leave the Netlify UI base directory blank — the toml handles it.

Required environment variables must be set in Netlify's dashboard under Site Settings > Environment Variables.

## Architecture Notes

- **Server-side Supabase**: All API routes use `getServiceClient()` (service role) to bypass RLS. Never use the anon client for writes.
- **Auth flow**: Stack Auth on client (`useUser()`), user ID forwarded to API via `x-user-id` header.
- **AI models**: DeepSeek v3.2 for evaluation, DeepSeek Chat for generation — via OpenRouter.
- **FK safety**: Always call `ensureUserProfile(userId, email)` before any write that references `user_profiles(id)`.
- **Dynamic params**: Next.js 16 requires `params: Promise<{ id: string }>` — always `await` params.
- **CJ token cache**: Stored in Supabase `kv_store` table for persistence across serverless instances. Token refreshes are rate-limited (1 per 5 min by CJ).
- **Wildcard subdomains**: Middleware exists for `[slug].bizwin.lol` routing. Enable by adding `*.bizwin.lol` as a domain alias in Netlify (requires Netlify DNS).
