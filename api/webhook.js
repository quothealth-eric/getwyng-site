/**
 * Stripe Webhook Handler
 * Processes payment events and unlocks reports
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Disable body parser for webhook
export const config = {
    api: {
        bodyParser: false,
    },
};

// Read raw body for Stripe signature verification
async function getRawBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            await handleSuccessfulPayment(event.data.object);
            break;

        case 'checkout.session.expired':
            await handleExpiredSession(event.data.object);
            break;

        case 'payment_intent.payment_failed':
            await handleFailedPayment(event.data.object);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
}

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(session) {
    console.log('Payment successful for audit:', session.client_reference_id);

    const auditId = session.client_reference_id;
    const paymentAmount = session.amount_total / 100; // Convert from cents
    const customerEmail = session.customer_email || session.customer_details?.email;

    try {
        // Update audit record in database
        const { data, error } = await supabase
            .from('audits')
            .update({
                status: 'paid',
                payment_amount: paymentAmount,
                payment_date: new Date().toISOString(),
                stripe_session_id: session.id,
                customer_email: customerEmail,
            })
            .eq('id', auditId)
            .single();

        if (error) {
            console.error('Failed to update audit status:', error);
            return;
        }

        console.log('Audit unlocked:', auditId);

        // Send confirmation email (implement with your email service)
        if (customerEmail) {
            await sendConfirmationEmail(customerEmail, auditId, paymentAmount);
        }

    } catch (error) {
        console.error('Error processing successful payment:', error);
    }
}

/**
 * Handle expired checkout session
 */
async function handleExpiredSession(session) {
    console.log('Session expired for audit:', session.client_reference_id);

    // Update audit status to expired
    await supabase
        .from('audits')
        .update({ status: 'expired' })
        .eq('id', session.client_reference_id);
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);

    // Log the failure for follow-up
    // You might want to send a notification to the customer
}

/**
 * Send confirmation email
 */
async function sendConfirmationEmail(email, auditId, amount) {
    // This is a placeholder - implement with your email service
    // For example, using Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
        from: 'Wyng <noreply@getwyng.co>',
        to: email,
        subject: 'Your Wyng Bill Audit Report is Ready',
        html: `
            <h2>Thank you for your purchase!</h2>
            <p>Your bill audit report is now available.</p>
            <p><a href="${process.env.SITE_URL}/demo?view=${auditId}">View Your Report</a></p>
            <p>Amount paid: $${amount}</p>
            <p>If you have any questions, please contact support@getwyng.co</p>
        `
    });
    */

    console.log(`Email would be sent to ${email} for audit ${auditId}`);
}