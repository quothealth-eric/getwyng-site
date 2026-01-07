/**
 * Stripe Checkout Session Creation
 * Creates a payment session for bill audit reports
 */

import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { auditId, price, email, returnUrl } = req.body;

        if (!auditId || !price) {
            return res.status(400).json({
                error: 'Missing required fields: auditId and price'
            });
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Wyng Bill Audit Report',
                            description: `Complete audit report with ${price >= 100 ? 'significant' : 'identified'} savings opportunities`,
                            images: ['https://getwyng.co/wyng-logo.png'], // Add your logo
                        },
                        unit_amount: price * 100, // Stripe uses cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            customer_email: email || undefined,
            client_reference_id: auditId,
            success_url: `${returnUrl || process.env.SITE_URL}/demo?success=true&audit=${auditId}`,
            cancel_url: `${returnUrl || process.env.SITE_URL}/demo?canceled=true&audit=${auditId}`,
            metadata: {
                auditId,
                source: 'bill-audit-demo',
                timestamp: new Date().toISOString()
            },
            // Enable automatic tax collection if configured
            automatic_tax: { enabled: false },
            // Allow promotion codes
            allow_promotion_codes: true,
            // Expire session after 30 minutes
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
        });

        // Return checkout session URL
        res.status(200).json({
            success: true,
            checkoutUrl: session.url,
            sessionId: session.id,
            expiresAt: session.expires_at
        });

    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({
            error: 'Failed to create checkout session',
            message: error.message
        });
    }
}