/**
 * Pricing calculation for Wyng Bill Audit
 * Hybrid model: Pay What You Save (10%) with minimum and maximum
 */

/**
 * Calculate the price based on potential savings
 * @param {number} savings - Total potential savings found
 * @returns {Object} Pricing details
 */
export function calculatePrice(savings) {
    // Pricing constants
    const MIN_PRICE = 29;
    const MAX_PRICE = 199;
    const PERCENTAGE = 0.10; // 10% of savings

    // Calculate base price (10% of savings)
    let price = savings * PERCENTAGE;

    // Apply minimum and maximum
    if (price < MIN_PRICE) {
        price = MIN_PRICE;
    } else if (price > MAX_PRICE) {
        price = MAX_PRICE;
    }

    // Round to nearest dollar
    price = Math.round(price);

    return {
        price,
        savings,
        percentage: PERCENTAGE * 100,
        model: determineModel(price, savings),
        displayPrice: `$${price}`,
        savingsRatio: savings > 0 ? (savings / price).toFixed(1) : 0,
        priceJustification: getPriceJustification(price, savings)
    };
}

/**
 * Determine which pricing model applies
 */
function determineModel(price, savings) {
    if (price === 29) {
        return 'minimum';
    } else if (price === 199) {
        return 'maximum';
    } else {
        return 'percentage';
    }
}

/**
 * Get price justification text for display
 */
function getPriceJustification(price, savings) {
    const ratio = savings / price;

    if (ratio >= 10) {
        return `Save ${ratio.toFixed(0)}x what you pay!`;
    } else if (ratio >= 5) {
        return `Get back ${ratio.toFixed(1)}x your investment`;
    } else if (ratio >= 2) {
        return `Save ${ratio.toFixed(1)}x the cost`;
    } else {
        return `Professional audit at minimum price`;
    }
}

/**
 * Calculate tiered pricing for different service levels
 * (For future premium features)
 */
export function getTieredPricing(savings) {
    const basic = calculatePrice(savings);

    return {
        basic: {
            ...basic,
            name: 'Basic Audit Report',
            features: [
                'Full audit report',
                'All billing errors identified',
                'Appeal letter template',
                'Phone scripts',
                'PDF download'
            ]
        },
        premium: {
            price: Math.min(basic.price * 1.5, 299),
            name: 'Premium Support',
            features: [
                'Everything in Basic',
                '30-day email support',
                'Personalized appeal review',
                'Follow-up assistance',
                'Priority processing'
            ]
        },
        enterprise: {
            price: Math.min(basic.price * 2.5, 499),
            name: 'Full Service',
            features: [
                'Everything in Premium',
                'We handle appeals for you',
                '90-day support',
                'Multiple bill reviews',
                'Success guarantee'
            ]
        }
    };
}

/**
 * Format price for display
 */
export function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

/**
 * Calculate refund eligibility
 */
export function isRefundEligible(price, actualSavings) {
    // Refund if actual savings less than 2x price paid
    return actualSavings < (price * 2);
}

export default {
    calculatePrice,
    getTieredPricing,
    formatPrice,
    isRefundEligible
};