# Environment Variables Setup Guide

This document outlines all environment variables required for TWERKHUB production deployment.

## Required Environment Variables

### Supabase Configuration
These variables connect your application to Supabase for authentication, database, and storage.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**How to obtain:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to Settings → API
4. Copy the Project URL and anon key
5. Copy the service role key (keep this secret!)

### Stripe Configuration
Required for payment processing and subscription management.

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-publishable-key
STRIPE_SECRET_KEY=sk_live_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

**How to obtain:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → API Keys
3. Copy Publishable and Secret keys (make sure you're in live mode for production)
4. Go to Developers → Webhooks
5. Create a webhook for your domain with events: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
6. Copy the webhook signing secret

### Application Configuration

```env
NEXT_PUBLIC_APP_URL=https://twerkhub.com
NODE_ENV=production
```

### Optional: Email Configuration (for transactional emails)

```env
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@twerkhub.com
```

## Local Development Setup

For local development, create a `.env.local` file in your project root:

```env
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IlhYWFhYWFhYWFhYWFhYWCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjI3OTg1NzYxLCJleHAiOjE5NjM1NDU3NjF9.your-token
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (use test keys for local development)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-test-key
STRIPE_SECRET_KEY=sk_test_your-test-key
STRIPE_WEBHOOK_SECRET=whsec_test_your-test-secret

# Local Development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Database Connection Pooling (Production)

For production, configure Supabase connection pooling:

```env
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:6543/postgres?pgbouncer=true&schema=public
```

This uses the PgBouncer pooler endpoint (port 6543) instead of direct connections (port 5432).

## Setting Environment Variables by Platform

### Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable as a new entry
4. Select which environments they apply to (Production, Preview, Development)
5. Redeploy for changes to take effect

### Docker / Self-Hosted
1. Create a `.env.production` file with all variables
2. Load via docker-compose or your deployment orchestration
3. Ensure the file is not committed to version control

### AWS Lambda / Functions
1. Use AWS Systems Manager Parameter Store or Secrets Manager
2. Reference parameters in your Lambda environment variables
3. Grant Lambda execution role permissions to access secrets

## Security Best Practices

⚠️ **IMPORTANT SECURITY NOTES:**

1. **Never commit `.env.local` to version control** - Add to `.gitignore`
2. **Keep secret keys confidential** - Rotate Stripe and Supabase keys periodically
3. **Use strong webhook secrets** - Stripe provides cryptographically secure webhooks
4. **Limit API key permissions** - Use Supabase role-based access control
5. **Enable CORS restrictions** - Only allow requests from your domain
6. **Monitor webhook events** - Set up alerts for payment failures
7. **Use environment-specific keys** - Never use production keys for testing
8. **Rotate keys regularly** - Update Stripe and Supabase keys every 90 days

## Verification Checklist

After setting environment variables, verify your configuration:

```bash
# Test Supabase connection
npm run test:supabase

# Test Stripe configuration
npm run test:stripe

# Run full integration tests
npm run test:integration
```

## Troubleshooting

### "Invalid Supabase credentials"
- Verify `NEXT_PUBLIC_SUPABASE_URL` includes `https://`
- Check that keys are not truncated
- Ensure project is active in Supabase dashboard

### "Stripe authentication failed"
- Verify you're using live keys for production (pk_live_, sk_live_)
- Check webhook secret is correct in your environment
- Ensure webhook is active and pointing to correct URL

### "Webhook signature verification failed"
- Verify `STRIPE_WEBHOOK_SECRET` starts with `whsec_`
- Check webhook is configured for correct events
- Ensure webhook URL matches `NEXT_PUBLIC_APP_URL/api/webhooks/stripe`

## Next Steps

1. Set all required environment variables for your deployment platform
2. Test authentication and payments in staging environment
3. Monitor logs and error tracking (Sentry, LogRocket, etc.)
4. Set up automated backup of database secrets
5. Document your deployment process for your team
