# TWERKHUB - Production Platform Architecture

## Directory Structure

```
twerkhub/
├── frontend/
│   ├── public/
│   │   └── videos/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx (homepage)
│   │   │   ├── auth/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── callback/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── portals/
│   │   │   │   ├── free/page.tsx
│   │   │   │   ├── private/page.tsx
│   │   │   │   └── playlist/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   └── api/
│   │   │       ├── auth/[action]/route.ts
│   │   │       ├── tokens/route.ts
│   │   │       ├── referral/route.ts
│   │   │       ├── stripe/webhook/route.ts
│   │   │       └── content/signed-url/route.ts
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── VideoHero.tsx
│   │   │   ├── TokenDisplay.tsx
│   │   │   ├── PortalCard.tsx
│   │   │   ├── PricingCard.tsx
│   │   │   └── ProtectedContent.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   ├── stripe.ts
│   │   │   ├── tokens.ts
│   │   │   ├── referral.ts
│   │   │   └── types.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── utils/
│   │       └── helpers.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── .env.local.example
├── backend/
│   ├── supabase/
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_rls_policies.sql
│   │   │   ├── 003_functions.sql
│   │   │   └── 004_triggers.sql
│   │   └── config.toml
│   └── README.md
├── docs/
│   ├── DEPLOYMENT.md
│   ├── API.md
│   ├── DATABASE.md
│   └── ENVIRONMENT.md
└── README.md
```

## Key Tables

- `users_profile` - User data, tokens, level, referral_code
- `tokens_log` - Token transaction log
- `referrals` - Tracking inviter → invited relationship
- `content` - Protected video metadata
- `subscriptions` - Stripe subscription tracking

## Security Layer

- Row Level Security (RLS) on all tables
- Signed URLs for content delivery
- Session-based authentication
- Webhook signature validation (Stripe)
- Rate limiting on token endpoints
