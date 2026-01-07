# Wyng Bill Audit Demo - Implementation Guide

## Overview

The Wyng Bill Audit Demo is a revenue-generating feature that allows users to upload medical bills and EOBs, run them through our 18-rule audit engine, and purchase the full audit report if they find value in the preview.

## Architecture

### Frontend
- **demo.html** - Terminal-themed UI for the audit demo
- **demo.js** - Main application logic with paywall integration
- **styles.css** - Terminal aesthetic styling

### Backend APIs
- **/api/analyze.js** - Main audit endpoint using OCR and rules engine
- **/api/create-checkout.js** - Creates Stripe payment sessions
- **/api/webhook.js** - Handles Stripe payment confirmations
- **/api/get-report.js** - Retrieves paid reports
- **/api/capture-email.js** - Captures emails from non-buyers

### Rules Engine (`/lib/rules/`)
- **18 specialized rules** for detecting billing errors
- Each rule returns findings with savings calculations
- Rules include: Duplicate charges, math errors, bundling violations, etc.

### Utilities (`/lib/`)
- **pricing.js** - Dynamic pricing calculation (10% of savings, $29-199)
- **composer.js** - Report generation, appeal letters, phone scripts
- **ocr.js** - Document parsing with OpenAI/Anthropic
- **parser.js** - Structured data extraction from OCR results

## Setup Instructions

### 1. Environment Variables
Copy `.env.local.template` to `.env.local` and fill in:
```bash
# Required
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...

# Optional
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### 2. Database Setup (Supabase)
1. Create a Supabase project
2. Run the schema in `/database/schema.sql`
3. Copy the URL and service key to `.env.local`

### 3. Stripe Setup
1. Create Stripe account and get API keys
2. Set up webhook endpoint: `https://yoursite.com/api/webhook`
3. Listen for events: `checkout.session.completed`
4. Copy webhook secret to `.env.local`

### 4. Install Dependencies
```bash
npm install
```

### 5. Local Development
```bash
npm run dev
# Visit http://localhost:3000/demo.html
```

## User Flow

1. **Upload** - User uploads bill + EOB files
2. **Insurance Info** - Basic plan details collected
3. **Processing** - OCR extraction and rules engine analysis
4. **Preview** - Free preview showing savings summary + 1-2 findings
5. **Paywall** - "Unlock full report for $X" (dynamic pricing)
6. **Payment** - Stripe checkout
7. **Delivery** - Full report with appeal letters and scripts

## Pricing Model

- **Formula**: `max($29, savings × 10%)`
- **Range**: $29 - $199
- **Examples**:
  - $200 savings → $29 (minimum)
  - $500 savings → $50 (10%)
  - $2,000 savings → $199 (capped)

## Revenue Features

### Preview (Free)
- Total savings amount
- Number of findings
- 1-2 finding previews
- General recommendations

### Full Report (Paid)
- All findings with explanations
- Regulatory citations
- Custom appeal letter
- Phone scripts (provider & insurance)
- Action checklist
- 30-day email support
- PDF download

## Money-Back Guarantee
"If our materials don't help you save at least 2x what you paid, email us for a full refund."

## Email Capture
For users who don't purchase:
- Exit intent popup
- Free guide: "5 Things to Check on Every Medical Bill"
- 3-email follow-up sequence

## Testing

### Test Mode
Use Stripe test keys and test card numbers:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002

### Sample Files
Place test bills/EOBs in `/test-files/` for development

## Analytics to Track

- Upload completion rate
- Preview-to-payment conversion
- Average order value
- Refund rate
- Email capture rate
- Rule hit rates

## Security Considerations

- All files deleted after 24 hours
- HIPAA-compliant infrastructure required for production
- No PHI stored in logs
- Secure file upload with virus scanning
- Rate limiting on API endpoints

## Deployment

### Vercel Deployment
```bash
npm run deploy
```

### Environment Variables in Vercel
Add all variables from `.env.local` to Vercel dashboard

### Webhook Configuration
Update Stripe webhook URL to production domain

## Hiding Demo During Development

The demo is currently not linked from the main navigation. To access:
- Direct URL: `/demo.html`
- Or add temporary link during testing

To make live:
1. Add navigation item to `index.html`
2. Or create targeted landing page with CTA

## Support

For issues or questions about the demo implementation:
- Check error logs in Vercel dashboard
- Review Stripe webhook events
- Monitor Supabase logs for database issues

## Next Steps

1. Complete remaining rule implementations
2. Add PDF report generation
3. Implement email sequences
4. Create admin dashboard for analytics
5. Add A/B testing for pricing
6. Build referral program