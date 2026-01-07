# EXACT Environment Variables Needed for Wyng Bill Audit Demo

## Required Variables (MUST HAVE)

### 1. OpenAI API Key (for OCR/document parsing)
```bash
OPENAI_API_KEY=sk-proj-[your-actual-key-here]
```
**Get it from:** https://platform.openai.com/api-keys
- Create an account
- Go to API Keys section
- Create new secret key
- Copy immediately (only shown once)

### 2. Stripe Keys (for payments)
```bash
# Live keys (for production)
STRIPE_SECRET_KEY=sk_live_[your-actual-key-here]
STRIPE_PUBLISHABLE_KEY=pk_live_[your-actual-key-here]

# OR Test keys (for development)
STRIPE_SECRET_KEY=sk_test_[your-actual-key-here]
STRIPE_PUBLISHABLE_KEY=pk_test_[your-actual-key-here]

# Webhook secret (after setting up webhook)
STRIPE_WEBHOOK_SECRET=whsec_[your-actual-secret-here]
```
**Get them from:** https://dashboard.stripe.com/apikeys
- Sign up for Stripe account
- Go to Developers → API Keys
- Copy both Publishable and Secret keys
- For webhook secret: Go to Webhooks → Add endpoint → Copy signing secret

### 3. Site URL
```bash
SITE_URL=https://getwyng.co
# OR for local development:
SITE_URL=http://localhost:3000
```

## Optional Variables (Choose Your Setup)

### Option A: Minimal Setup (No Database)
If you want to run WITHOUT any database:
```bash
# No additional variables needed!
# Reports stored temporarily in memory
# Payment tracking via Stripe metadata only
```

### Option B: With Supabase (For Analytics)
If you want to track anonymized metrics:
```bash
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_SERVICE_KEY=eyJ[your-actual-service-key]
```
**Get them from:** https://app.supabase.com
- Create free project
- Go to Settings → API
- Copy URL and service_role key

### Option C: With Redis (For Temporary Storage)
If you want better temporary storage than in-memory:
```bash
REDIS_URL=redis://[username]:[password]@[host]:[port]
# Example with Upstash Redis (free tier):
REDIS_URL=redis://default:your-password@usw1-sharing-salmon-12345.upstash.io:12345
```
**Get it from:** https://upstash.com
- Create free Redis database
- Copy Redis URL

## Email Service (Optional - for follow-ups)

### Option 1: Resend (Recommended - easier)
```bash
RESEND_API_KEY=re_[your-actual-key-here]
```
**Get it from:** https://resend.com
- Sign up (free tier available)
- Go to API Keys
- Create and copy key

### Option 2: SendGrid
```bash
SENDGRID_API_KEY=SG.[your-actual-key-here]
```
**Get it from:** https://sendgrid.com
- Sign up
- Go to Settings → API Keys
- Create and copy key

## Complete .env.local Example

### Minimal Setup (Recommended for Starting)
```bash
# Required
OPENAI_API_KEY=sk-proj-abc123xyz...
STRIPE_SECRET_KEY=sk_test_51N...
STRIPE_PUBLISHABLE_KEY=pk_test_51N...
STRIPE_WEBHOOK_SECRET=whsec_abc123...
SITE_URL=http://localhost:3000
```

### Full Setup (With Analytics & Email)
```bash
# Required
OPENAI_API_KEY=sk-proj-abc123xyz...
STRIPE_SECRET_KEY=sk_live_51N...
STRIPE_PUBLISHABLE_KEY=pk_live_51N...
STRIPE_WEBHOOK_SECRET=whsec_abc123...
SITE_URL=https://getwyng.co

# Optional - Database
SUPABASE_URL=https://xyzabc.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...

# Optional - Email
RESEND_API_KEY=re_abc123xyz...

# Optional - Better temporary storage
REDIS_URL=redis://default:password@server.upstash.io:6379
```

## Testing Your Setup

### 1. Test OpenAI Connection
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### 2. Test Stripe
Use test card: 4242 4242 4242 4242 (any future date, any CVC)

### 3. Test Locally
```bash
npm install
npm run dev
# Visit http://localhost:3000/demo.html
```

## Security Notes

1. **NEVER commit .env.local to git** (it's in .gitignore)
2. **Use test keys during development**
3. **Switch to live keys only in production**
4. **Rotate keys if ever exposed**

## Deployment to Vercel

Add these same variables in Vercel Dashboard:
1. Go to your project settings
2. Click "Environment Variables"
3. Add each variable
4. Deploy

## Costs to Expect

- **OpenAI**: ~$0.02-0.05 per document processed
- **Stripe**: 2.9% + $0.30 per successful payment
- **Supabase**: Free tier sufficient for <10K audits/month
- **Resend**: Free tier = 100 emails/day
- **Upstash Redis**: Free tier = 10K commands/day

## Quick Start Commands

```bash
# 1. Copy template
cp .env.local.template .env.local

# 2. Edit with your keys
nano .env.local

# 3. Install and run
npm install
npm run dev

# 4. Test at
open http://localhost:3000/demo.html
```