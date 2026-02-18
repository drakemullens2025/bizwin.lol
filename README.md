# bizwin.lol

An AI-powered entrepreneurship education platform that teaches e-commerce through hands-on dropshipping with CJ Dropshipping. Students learn by doing — building real stores, sourcing products, completing business scenarios, and competing on leaderboards.

## Tech Stack

- **Framework**: Next.js 16 (React 19, App Router, Turbopack)
- **Language**: TypeScript
- **Auth**: Stack Auth (`@stackframe/stack`)
- **Database**: Supabase (PostgreSQL with RLS)
- **AI**: OpenRouter (DeepSeek models) for evaluation, scenario generation, and business analysis
- **Supplier API**: CJ Dropshipping API v2 (product sourcing, inventory, orders)

## Project Structure

```
app/
├── app/
│   ├── (platform)/           # Authenticated app pages
│   │   ├── dashboard/        # Main dashboard with stats overview
│   │   ├── learn/[tier]/     # Scenario-based learning (Tiers 0-3)
│   │   ├── catalog/          # CJ product search & sourcing
│   │   ├── stores/           # Multi-store manager
│   │   ├── stores/new/       # Store creation wizard with templates
│   │   ├── store/products/   # Product management
│   │   ├── store/orders/     # Order management
│   │   ├── store/setup/      # Store configuration
│   │   ├── intelligence/     # Supply chain intelligence dashboard
│   │   ├── analytics/        # Business & learning analytics
│   │   ├── leaderboard/      # XP leaderboard
│   │   ├── challenges/       # Weekly/monthly challenges
│   │   ├── cohorts/          # Classroom cohorts
│   │   ├── cohorts/[id]/     # Cohort detail & educator dashboard
│   │   └── portfolio/        # Student portfolio (planned)
│   ├── api/
│   │   ├── ai/               # AI endpoints (evaluate, chat, generate-scenario, calibrate, advisors)
│   │   ├── analytics/        # Store & learning analytics, AI review, CSV export
│   │   ├── cj/               # CJ Dropshipping (products, categories, inventory)
│   │   ├── cohorts/          # Cohort CRUD, members, leaderboard, alerts, export, curriculum
│   │   ├── intelligence/     # Trends, margins, shipping, AI review
│   │   ├── store/            # Single-store CRUD, products, orders
│   │   ├── stores/           # Multi-store management
│   │   ├── challenges/       # Challenge progress tracking
│   │   ├── leaderboard/      # Global & cohort leaderboards
│   │   ├── portfolio/        # Portfolio API
│   │   ├── progress/         # Scenario progress
│   │   └── xp/               # XP tracking
│   └── store/[slug]/         # Public storefront
├── data/
│   ├── commerce-scenarios.ts # Tier 0 scenarios (20) + tier routing
│   ├── tier1-scenarios.ts    # Tier 1 Builder scenarios (15)
│   ├── tier2-scenarios.ts    # Tier 2 Operator scenarios (15)
│   ├── tier3-scenarios.ts    # Tier 3 Scale scenarios (10)
│   └── store-templates.ts    # 5 white-label store templates
├── lib/
│   ├── supabase.ts           # Database helpers (service client + all queries)
│   ├── cj.ts                 # CJ Dropshipping API client
│   └── xp.ts                 # XP/leveling system
├── db/
│   ├── schema.sql            # Base database schema
│   └── frontier-schema.sql   # Frontier features schema (4.2-4.6)
└── package.json
```

## Features

### Learning System
- **60 static scenarios** across 4 tiers (Foundation, Builder, Operator, Scale)
- **AI-generated scenarios** personalized to each student's store, weaknesses, and progress
- **AI evaluation** with rubric-based scoring across 4 dimensions per scenario type
- **Difficulty calibration** that recommends tier and difficulty based on performance

### Commerce
- **CJ Dropshipping integration** — search products, check inventory, place orders
- **Multi-store support** — create multiple stores from 5 white-label templates
- **Public storefronts** at `/store/[slug]` with customizable themes
- **Supply chain intelligence** — trending products, margin analysis, shipping estimates, AI lineup review

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
2. `db/frontier-schema.sql` — frontier tables (generated_scenarios, product_events, store_templates, analytics_snapshots)

### Install & Run

```bash
cd app
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## API Routes (40 endpoints)

| Route | Methods | Purpose |
|---|---|---|
| `/api/ai/evaluate` | POST | AI scenario evaluation with rubric scoring |
| `/api/ai/chat` | POST | AI commerce mentor chat |
| `/api/ai/generate-scenario` | POST | Generate personalized scenario |
| `/api/ai/calibrate` | GET | Recommend tier/difficulty for user |
| `/api/ai/product-advisor` | POST | AI product sourcing advice |
| `/api/ai/store-critic` | POST | AI store design feedback |
| `/api/ai/pricing-advisor` | POST | AI pricing strategy advice |
| `/api/analytics/store` | GET | Store revenue & product analytics |
| `/api/analytics/learning` | GET | Learning scores & progress analytics |
| `/api/analytics/ai-review` | POST | AI business review with grade |
| `/api/analytics/export` | GET | CSV export (orders/products/summary) |
| `/api/cj/products` | GET | Search CJ product catalog |
| `/api/cj/categories` | GET | CJ product categories |
| `/api/cj/inventory` | GET | Check CJ inventory/shipping |
| `/api/cohorts` | GET/POST | List/create cohorts |
| `/api/cohorts/[id]` | GET/PATCH/DELETE | Cohort CRUD |
| `/api/cohorts/join` | POST | Join cohort by code |
| `/api/cohorts/[id]/members` | GET | List cohort members |
| `/api/cohorts/[id]/leaderboard` | GET | Cohort-specific leaderboard |
| `/api/cohorts/[id]/students/[studentId]` | GET | Student drill-down |
| `/api/cohorts/[id]/export` | GET | CSV export of cohort data |
| `/api/cohorts/[id]/alerts` | GET | Struggling student detection |
| `/api/cohorts/[id]/curriculum` | GET/PATCH | Cohort curriculum config |
| `/api/intelligence/trends` | GET | Trending searches & products |
| `/api/intelligence/margins` | GET | Product margin analysis |
| `/api/intelligence/shipping` | GET | Shipping estimates & inventory |
| `/api/intelligence/ai-review` | POST | AI product lineup review |
| `/api/store` | GET/POST | User's store CRUD |
| `/api/store/[slug]` | GET | Public storefront data |
| `/api/store/products` | GET/POST/DELETE | Store product management |
| `/api/store/orders` | GET/POST | Order management |
| `/api/stores` | GET/POST | Multi-store list/create |
| `/api/stores/[storeId]` | GET/PATCH/DELETE | Specific store management |
| `/api/progress` | GET/POST | Scenario progress tracking |
| `/api/xp` | GET/POST | XP balance & awards |
| `/api/leaderboard` | GET | Global leaderboard |
| `/api/challenges` | GET | Active challenges |
| `/api/challenges/[id]` | POST | Update challenge progress |
| `/api/portfolio/[userId]` | GET | User portfolio data |
| `/api/portfolio/settings` | GET/PATCH | Portfolio settings |

## Architecture Notes

- **Server-side Supabase**: All API routes use `getServiceClient()` (service role) to bypass RLS. Never use the anon client for writes.
- **Auth flow**: Stack Auth on client (`useUser()`), user ID forwarded to API via `x-user-id` header.
- **AI models**: DeepSeek v3.2 for evaluation, DeepSeek Chat for generation — via OpenRouter.
- **FK safety**: Always call `ensureUserProfile(userId, email)` before any write that references `user_profiles(id)`.
- **Dynamic params**: Next.js 16 requires `params: Promise<{ id: string }>` — always `await` params.
