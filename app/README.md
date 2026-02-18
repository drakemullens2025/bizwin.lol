# bizwin.lol

**Learn entrepreneurship by running a real business.**

bizwin.lol is an experiential learning platform where students build and operate real e-commerce stores. No simulations. Real products from CJDropshipping's 400K+ catalog, real storefronts, real customers, real revenue — guided by AI mentors that teach through the Socratic method.

---

## Architecture

| Layer | Tech | Status |
|---|---|---|
| Framework | Next.js 16 (React 19, App Router) | Running |
| Auth | Stack Auth | Live |
| Database | Supabase (PostgreSQL + RLS) | Connected |
| Product Catalog | CJDropshipping API v2 | Live — auto-auth with token persistence |
| AI Coaching | OpenRouter (DeepSeek v3.2) | Live |
| Payments | Stripe | Phase 4 |

## Quick Start

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.local.example` or configure:

```
# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=
STACK_SECRET_SERVER_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# CJDropshipping (API key, not token — token auto-managed)
CJ_API_KEY=

# OpenRouter
OPENROUTER_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Platform Structure

```
app/
├── (platform)/           # Authenticated routes
│   ├── dashboard/        # Command center — stats, progress, quick actions
│   ├── catalog/          # Browse 400K+ CJ products, AI product advisor
│   ├── learn/[tier]/     # 4-tier learning scenarios with Socratic AI mentor
│   └── store/
│       ├── setup/        # Store creation wizard + AI store critic
│       ├── products/     # Product management + AI pricing advisor
│       └── orders/       # Order management
├── store/[slug]/         # Public storefront — cart, checkout, orders
├── api/
│   ├── cj/              # CJ catalog proxy (products, categories, inventory)
│   ├── ai/              # 5 AI endpoints (chat, evaluate, product/store/pricing advisors)
│   └── store/           # Store CRUD, products, orders
└── lib/
    ├── cj-client.ts     # CJ API client — auto-auth, token persistence, rate-limit retry
    └── supabase.ts      # DB helpers — stores, products, orders, progress, caching
```

## CJ API Integration

The CJ client (`lib/cj-client.ts`) handles the full token lifecycle automatically:

- **Auth:** Posts API key to `/authentication/getAccessToken`, receives access token (15 days) + refresh token (180 days)
- **Persistence:** Tokens survive HMR via `globalThis` and server restarts via `.cj-token.json` (gitignored)
- **Rate limits:** Auto-retry on 429 with backoff (CJ enforces 1 req/sec on data, 1 req/5min on auth)
- **Normalization:** CJ's nested response shapes are flattened to consistent frontend interfaces

## AI Features

Five AI endpoints, all using DeepSeek v3.2 via OpenRouter:

| Endpoint | Purpose |
|---|---|
| `/api/ai/chat` | Socratic mentor — streaming, never gives answers, asks questions |
| `/api/ai/evaluate` | Rubric-based scoring across 4 dimensions (0-100) |
| `/api/ai/product-advisor` | Viability analysis, margin calc, competition assessment |
| `/api/ai/store-critic` | Brand coherence, niche clarity, naming feedback |
| `/api/ai/pricing-advisor` | Margin health, price range, psychological pricing tactics |

## Learning System

4 progressive tiers, each with scenarios evaluated by AI:

- **Tier 0 (Free):** Foundation — market analysis, product research, business math
- **Tier 1 ($19/mo):** Builder — store design, pricing strategy, copywriting
- **Tier 2 ($39/mo):** Operator — fulfillment, customer service, marketing
- **Tier 3 ($79/mo + 2%):** Scale — automation, multi-store, advanced analytics

## Documentation

- [`profundity.md`](../profundity.md) — VC pitch and vision document
- [`nextsteps.md`](../nextsteps.md) — Sequenced roadmap from current state to frontier
