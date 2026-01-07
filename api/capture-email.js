/**
 * Email Capture API
 * Captures emails from users who don't purchase immediately
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, auditId, source = 'exit-intent' } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        // Store email lead
        const { data, error } = await supabase
            .from('email_leads')
            .upsert({
                email,
                audit_id: auditId || null,
                source,
                captured_at: new Date().toISOString(),
                status: 'pending',
                metadata: {
                    userAgent: req.headers['user-agent'],
                    referer: req.headers.referer,
                    timestamp: Date.now()
                }
            }, {
                onConflict: 'email',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('Failed to capture email:', error);
            return res.status(500).json({ error: 'Failed to save email' });
        }

        // Send welcome email with free guide
        await sendWelcomeEmail(email);

        // Update audit record if auditId provided
        if (auditId) {
            await supabase
                .from('audits')
                .update({
                    customer_email: email,
                    email_captured: true
                })
                .eq('id', auditId);
        }

        res.status(200).json({
            success: true,
            message: 'Email captured successfully',
            freeGuideUrl: '/guides/5-things-medical-bills.pdf'
        });

    } catch (error) {
        console.error('Error capturing email:', error);
        res.status(500).json({
            error: 'Failed to process email',
            message: error.message
        });
    }
}

/**
 * Send welcome email with free guide
 */
async function sendWelcomeEmail(email) {
    // Placeholder for email implementation
    // Use Resend, SendGrid, or another email service

    console.log(`Welcome email would be sent to ${email}`);

    // Example with Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
        from: 'Wyng <hello@getwyng.co>',
        to: email,
        subject: 'Your Free Guide: 5 Things to Check on Every Medical Bill',
        html: `
            <h2>Welcome to Wyng!</h2>
            <p>Thank you for your interest in protecting yourself from medical billing errors.</p>
            <p>As promised, here's your free guide:</p>
            <p><a href="${process.env.SITE_URL}/guides/5-things-medical-bills.pdf">
                Download: 5 Things to Check on Every Medical Bill
            </a></p>
            <h3>Did you know?</h3>
            <ul>
                <li>80% of medical bills contain errors</li>
                <li>The average error is worth $1,200</li>
                <li>Most people never catch these mistakes</li>
            </ul>
            <p>If you have a specific bill you'd like audited,
               <a href="${process.env.SITE_URL}/demo">try our demo</a>
               to see how much you could save.</p>
            <p>Best regards,<br>The Wyng Team</p>
        `
    });
    */

    return true;
}