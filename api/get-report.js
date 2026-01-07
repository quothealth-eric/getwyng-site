/**
 * Get Report API
 * Retrieves audit report after payment verification
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { auditId, email } = req.query;

    if (!auditId) {
        return res.status(400).json({ error: 'Audit ID required' });
    }

    try {
        // Fetch audit from database
        const { data: audit, error } = await supabase
            .from('audits')
            .select('*')
            .eq('id', auditId)
            .single();

        if (error || !audit) {
            return res.status(404).json({ error: 'Audit not found' });
        }

        // Check if audit is paid or if email matches (for email verification)
        const isPaid = audit.status === 'paid';
        const isEmailMatch = email && audit.customer_email === email;

        if (!isPaid && !isEmailMatch) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'This report requires payment or email verification',
                status: audit.status,
                price: audit.price
            });
        }

        // Parse the stored report data
        const fullReport = JSON.parse(audit.full_report);

        // Return the full report
        res.status(200).json({
            success: true,
            audit: {
                id: audit.id,
                createdAt: audit.created_at,
                status: audit.status,
                paymentAmount: audit.payment_amount,
                paymentDate: audit.payment_date,
            },
            report: fullReport,
            downloadUrl: `/api/download-pdf?id=${auditId}` // Optional PDF generation
        });

    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({
            error: 'Failed to retrieve report',
            message: error.message
        });
    }
}