-- Privacy-First Database Schema
-- NO PHI/PII STORED - Only anonymized metadata

-- Minimal audit tracking table (no medical data)
CREATE TABLE audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Anonymized metrics only
    total_savings_cents INTEGER,
    findings_count INTEGER,
    rules_triggered TEXT[], -- Just rule IDs like ['R01', 'R04']

    -- Payment tracking
    price_cents INTEGER,
    payment_status TEXT DEFAULT 'pending', -- pending, paid, expired
    stripe_session_id TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,

    -- Temporary encrypted blob (auto-deleted after 24 hours)
    encrypted_report TEXT, -- Encrypted, expires quickly
    report_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),

    -- Analytics only (no identifying info)
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
);

-- Auto-delete expired reports
CREATE OR REPLACE FUNCTION delete_expired_reports() RETURNS void AS $$
BEGIN
    UPDATE audit_sessions
    SET encrypted_report = NULL
    WHERE report_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Run cleanup every hour
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('delete-expired-reports', '0 * * * *', 'SELECT delete_expired_reports();');

-- Email leads (separate from medical data)
CREATE TABLE email_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hash TEXT NOT NULL, -- SHA256 hash of email
    source TEXT, -- 'exit-intent', 'free-guide', etc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- No connection to audit data
    -- Email campaigns handled by external service
);

-- Analytics events (no PHI)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT, -- 'preview_viewed', 'payment_started', etc
    event_date DATE DEFAULT CURRENT_DATE,

    -- Aggregated metrics only
    savings_range TEXT, -- '$0-100', '$100-500', etc
    findings_range TEXT, -- '1-5', '6-10', etc

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_payment ON audit_sessions(payment_status);
CREATE INDEX idx_sessions_expires ON audit_sessions(report_expires_at);
CREATE INDEX idx_sessions_created ON audit_sessions(created_at);

-- Views for analytics (no PHI)
CREATE VIEW daily_metrics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_audits,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_audits,
    AVG(total_savings_cents) as avg_savings,
    AVG(findings_count) as avg_findings,
    AVG(price_cents) FILTER (WHERE payment_status = 'paid') as avg_price
FROM audit_sessions
GROUP BY DATE(created_at);

CREATE VIEW conversion_funnel AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as uploads,
    COUNT(*) FILTER (WHERE findings_count > 0) as with_findings,
    COUNT(*) FILTER (WHERE stripe_session_id IS NOT NULL) as checkout_started,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as completed
FROM audit_sessions
GROUP BY DATE(created_at);