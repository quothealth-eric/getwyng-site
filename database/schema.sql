-- Wyng Bill Audit Database Schema
-- For use with Supabase or PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Audits table - stores all audit sessions
CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, paid, refunded, expired

    -- Audit data
    bill_file_url TEXT,
    eob_file_url TEXT,
    insurance_info JSONB,

    -- Results
    preview_report JSONB,
    full_report JSONB,
    total_findings INTEGER DEFAULT 0,
    total_savings_cents INTEGER DEFAULT 0,

    -- Payment info
    price INTEGER, -- in cents
    payment_amount INTEGER, -- actual amount paid in cents
    payment_date TIMESTAMP WITH TIME ZONE,
    stripe_session_id TEXT,
    stripe_payment_intent TEXT,

    -- Customer info
    customer_email TEXT,
    customer_ip TEXT,
    user_agent TEXT,

    -- Tracking
    email_captured BOOLEAN DEFAULT FALSE,
    report_viewed_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB,

    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'paid', 'refunded', 'expired'))
);

-- Create indexes for common queries
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_created_at ON audits(created_at DESC);
CREATE INDEX idx_audits_customer_email ON audits(customer_email);
CREATE INDEX idx_audits_stripe_session ON audits(stripe_session_id);

-- Email leads table - for email capture
CREATE TABLE email_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    email TEXT NOT NULL UNIQUE,
    audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
    source TEXT, -- exit-intent, free-guide, newsletter, etc.
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Email status
    status TEXT DEFAULT 'pending', -- pending, subscribed, unsubscribed, bounced
    verified BOOLEAN DEFAULT FALSE,

    -- Engagement tracking
    emails_sent INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    last_engaged_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB,

    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_email_leads_email ON email_leads(email);
CREATE INDEX idx_email_leads_audit ON email_leads(audit_id);
CREATE INDEX idx_email_leads_status ON email_leads(status);

-- Audit findings table (optional - for analytics)
CREATE TABLE audit_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,

    rule_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    severity TEXT,
    confidence DECIMAL(3,2),
    savings_cents INTEGER,

    finding_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_findings_audit ON audit_findings(audit_id);
CREATE INDEX idx_findings_rule ON audit_findings(rule_id);
CREATE INDEX idx_findings_savings ON audit_findings(savings_cents DESC);

-- Analytics events table (optional)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    event_type TEXT NOT NULL, -- upload, process, view_preview, checkout_start, checkout_complete, etc.
    audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,

    properties JSONB,
    user_ip TEXT,
    user_agent TEXT,
    referer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
);

CREATE INDEX idx_events_audit ON analytics_events(audit_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_created ON analytics_events(created_at DESC);

-- Row Level Security (if using Supabase)
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies for public access (adjust as needed)
CREATE POLICY "Audits are viewable by ID" ON audits
    FOR SELECT USING (true);

CREATE POLICY "Audits can be created" ON audits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Audits can be updated" ON audits
    FOR UPDATE USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_audits_updated_at
    BEFORE UPDATE ON audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample queries

-- Get audit by ID with payment status
-- SELECT * FROM audits WHERE id = $1;

-- Get paid audits for a specific email
-- SELECT * FROM audits WHERE customer_email = $1 AND status = 'paid' ORDER BY created_at DESC;

-- Get conversion metrics
-- SELECT
--     DATE(created_at) as date,
--     COUNT(*) as total_audits,
--     COUNT(*) FILTER (WHERE status = 'paid') as paid_audits,
--     AVG(total_savings_cents) as avg_savings,
--     AVG(payment_amount) as avg_payment
-- FROM audits
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY DATE(created_at)
-- ORDER BY date DESC;