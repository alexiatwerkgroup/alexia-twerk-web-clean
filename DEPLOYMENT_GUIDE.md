# TWERKHUB Deployment Guide

Complete production deployment guide for TWERKHUB premium video platform.

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All environment variables configured (see `ENV_SETUP.md`)
- [ ] Database migrations applied
- [ ] Stripe account set up with webhook endpoints
- [ ] Supabase project created and configured
- [ ] SSL certificate obtained for your domain
- [ ] CDN configured for video delivery
- [ ] Backup strategy implemented
- [ ] Monitoring and error tracking set up (Sentry, LogRocket, etc.)
- [ ] All tests passing (`npm run test`)

## Architecture Overview

TWERKHUB is a full-stack Next.js application with the following architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│              (Next.js Frontend + React)                  │
└────────────────────┬────────────────────────────────────┘
                     │ (HTTPS)
┌────────────────────▼────────────────────────────────────┐
│            Vercel / Next.js Server                       │
│  (API Routes, SSR, Static Generation, Edge Functions)   │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┬──────────────┐
        │                           │              │
    ┌───▼──────┐         ┌──────────▼──┐    ┌─────▼────┐
    │ Supabase │         │   Stripe    │    │   R2/S3  │
    │ Auth     │         │  Payments   │    │ Storage  │
    │ Database │         │ Webhooks    │    │ (Videos) │
    │ Storage  │         │             │    │          │
    └──────────┘         └─────────────┘    └──────────┘
```

## Deployment Platforms

### Option 1: Vercel (Recommended for Next.js)

**Advantages:**
- Seamless Next.js integration
- Automatic deployments from Git
- Edge functions support
- Built-in analytics and monitoring
- Global CDN included

**Steps:**

1. **Connect Repository**
   ```bash
   # Push code to GitHub, GitLab, or Bitbucket
   git push origin main
   ```

2. **Create Vercel Project**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your repository
   - Select Next.js framework (auto-detected)

3. **Configure Environment Variables**
   - Project Settings → Environment Variables
   - Add all variables from `ENV_SETUP.md`
   - Select Production, Preview, and Development as needed

4. **Configure Build Settings**
   ```
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

5. **Domain Configuration**
   - Add custom domain in Vercel dashboard
   - Update DNS records to point to Vercel
   - Automatic SSL certificate via Let's Encrypt

6. **Deploy**
   - Push to main branch triggers automatic deployment
   - Monitor deployment status in Vercel dashboard

### Option 2: AWS (EC2 + RDS)

**Advantages:**
- Full control over infrastructure
- Scalable with auto-scaling groups
- Compatible with other AWS services
- S3 for video storage included

**Steps:**

1. **Set Up EC2 Instance**
   ```bash
   # Launch t3.medium instance (or larger)
   # Ubuntu 22.04 LTS AMI
   # Security group: Allow 80, 443, 22
   ```

2. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm postgresql-client
   node --version  # Verify Node.js 18+
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone <your-repo> /app
   cd /app

   # Install dependencies
   npm install --production

   # Build
   npm run build

   # Set environment variables
   cat > .env.production << 'EOF'
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # ... all other variables
   EOF

   # Start with PM2
   npm install -g pm2
   pm2 start npm --name "twerkhub" -- start
   pm2 startup
   pm2 save
   ```

4. **Configure Nginx Reverse Proxy**
   ```nginx
   server {
     listen 80;
     server_name twerkhub.com www.twerkhub.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

5. **SSL Certificate with Let's Encrypt**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d twerkhub.com -d www.twerkhub.com
   # Update nginx config with SSL paths
   sudo systemctl restart nginx
   ```

### Option 3: Docker + Kubernetes

**Advantages:**
- Container orchestration
- Auto-scaling and load balancing
- Rolling deployments
- Multi-region support

**Steps:**

1. **Create Dockerfile** (included in repo)
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   RUN npm install --production
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Push Image**
   ```bash
   docker build -t twerkhub:latest .
   docker tag twerkhub:latest YOUR_REGISTRY/twerkhub:latest
   docker push YOUR_REGISTRY/twerkhub:latest
   ```

3. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

## Database Setup (Supabase)

1. **Create Supabase Project**
   - Visit [app.supabase.com](https://app.supabase.com)
   - Create new project
   - Choose region closest to your users

2. **Run Migrations**
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or manually execute SQL
   # Copy contents of supabase/migrations/001_init.sql
   # Run in Supabase SQL editor
   ```

3. **Configure RLS Policies**
   - All RLS policies included in migration
   - Verify in Supabase: Table Editor → Select table → RLS Policy tab

4. **Enable Replication** (for backups)
   - Settings → Backup and Recovery
   - Enable automated backups (daily)
   - Configure backup retention (30 days)

## Stripe Integration

1. **Create Stripe Account**
   - Sign up at [stripe.com](https://stripe.com)
   - Activate account (identity verification)

2. **Create Products and Prices**
   ```bash
   # Use Stripe CLI or dashboard
   # Create 3 products:
   # - Free ($0)
   # - Basic ($4.99/month or $49.90/year)
   # - Premium ($19.99/month or $199.90/year)
   ```

3. **Configure Webhooks**
   ```
   Endpoint: https://twerkhub.com/api/webhooks/stripe
   Events:
   - invoice.payment_succeeded
   - invoice.payment_failed
   - customer.subscription.updated
   - customer.subscription.deleted
   ```

4. **Add API Keys to Environment**
   - Publishable key (pk_live_...)
   - Secret key (sk_live_...)
   - Webhook secret (whsec_...)

## Video Storage (S3 / R2)

### Using Cloudflare R2
```bash
# Set up R2 bucket
# Upload videos with signed URLs
# Configure CORS for video playback

# In .env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=twerkhub-videos
```

### Using AWS S3
```bash
# Create S3 bucket: twerkhub-videos
# Enable versioning: Settings → Versioning
# Configure lifecycle policy: 90-day deletion of old versions
# Set bucket encryption: AES-256

# Create IAM user with S3 access
# Generate access keys for application
```

## Monitoring and Logging

### Error Tracking (Sentry)
```javascript
// Automatically configured in next.config.js
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

### Application Performance Monitoring
- Vercel Analytics (if using Vercel)
- New Relic APM
- DataDog

### Logs
- Supabase: Logs available in dashboard
- Stripe: Webhook logs in dashboard
- Application logs: Use `npm install -g pm2` with log aggregation

## Scaling Considerations

### Horizontal Scaling
- Vercel: Automatic with edge functions
- AWS: Use Application Load Balancer + Auto Scaling Group
- Docker: Kubernetes HPA (Horizontal Pod Autoscaler)

### Database Scaling
- Connection pooling: Supabase PgBouncer (port 6543)
- Read replicas: For analytics queries
- Archive old watch history: Move to separate table quarterly

### Video Delivery
- CDN: Cloudflare, CloudFront, or Bunny.net
- HLS streaming: For better compatibility
- Adaptive bitrate: Multiple quality levels

## Backup Strategy

### Database Backups
```bash
# Automated via Supabase
# Settings → Backup and Recovery
# Retention: 30 days
# Manual backup: pg_dump via CLI
pg_dump -h db.supabase.co -U postgres -d postgres > backup.sql
```

### Application Backups
- Git repository (version control)
- Infrastructure as Code: Terraform/CloudFormation

### Disaster Recovery
- RTO: 1 hour
- RPO: 24 hours
- Test restore quarterly

## Post-Deployment

1. **Test in Production**
   ```bash
   # Test authentication flow
   # Test payment processing (use Stripe test mode during validation)
   # Test video playback
   # Test referral system
   # Monitor error logs
   ```

2. **Set Up Alerts**
   - Email alerts for failed payments
   - Webhook delivery failures
   - Database connection issues
   - High error rates (>1%)

3. **Enable Analytics**
   - Google Analytics / Segment
   - Stripe analytics
   - Supabase analytics

4. **Security Hardening**
   - Enable WAF (Web Application Firewall)
   - Configure DDoS protection
   - Set rate limits on API endpoints
   - Rotate secrets monthly

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs twerkhub

# Verify environment variables
env | grep NEXT_PUBLIC

# Test build locally
npm run build
npm start
```

### Database Connection Failed
```bash
# Check Supabase status
# Verify IP whitelist (if applicable)
# Test connection: psql postgresql://user@host/db
```

### Stripe Webhooks Not Received
- Verify webhook URL in Stripe dashboard
- Check webhook secret in environment
- Verify CORS allows POST from Stripe IPs
- Check application logs for webhook errors

## Rollback Procedure

### Vercel
```bash
# Select previous deployment
# Click "Promote to Production"
```

### EC2/Manual
```bash
# Revert to previous version
git revert <commit-hash>
npm run build
pm2 restart twerkhub
```

### Docker
```bash
kubectl rollout undo deployment/twerkhub
```

## Maintenance Schedule

- **Daily**: Monitor error logs and payment failures
- **Weekly**: Review analytics and user metrics
- **Monthly**: Security updates and dependency bumps
- **Quarterly**: Performance optimization and capacity planning
- **Annually**: Disaster recovery drill

## Contact and Support

For deployment issues:
- Supabase Support: [supabase.com/support](https://supabase.com/support)
- Stripe Support: [stripe.com/docs/support](https://stripe.com/docs/support)
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Development Team: dev@twerkhub.com
