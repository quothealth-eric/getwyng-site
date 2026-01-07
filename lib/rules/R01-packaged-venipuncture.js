/**
 * Rule R01: Packaged Venipuncture
 * Detects when venipuncture (blood draw) is charged separately
 * when it should be bundled with lab tests
 */

const VENIPUNCTURE_CODES = [
    '36415', // Collection of venous blood by venipuncture
    '36416', // Collection of capillary blood specimen
    '36410', // Venipuncture, age 3 years or younger
    'G0001', // Routine venipuncture for collection
];

const VENIPUNCTURE_KEYWORDS = [
    'venipuncture',
    'blood draw',
    'blood collection',
    'phlebotomy',
    'specimen collection',
    'lab draw'
];

const LAB_TEST_PATTERNS = [
    /^80\d{3}/,  // Chemistry tests
    /^81\d{3}/,  // Urinalysis
    /^82\d{3}/,  // Chemistry procedures
    /^83\d{3}/,  // Chemistry procedures
    /^84\d{3}/,  // Chemistry procedures
    /^85\d{3}/,  // Hematology
    /^86\d{3}/,  // Immunology
    /^87\d{3}/,  // Microbiology
    /^88\d{3}/,  // Pathology
];

export default async function R01_PackagedVenipuncture(data, insuranceInfo) {
    const findings = [];
    let totalSavings = 0;

    // Check if bill has itemized charges
    if (!data.billLines || data.billLines.length === 0) {
        return {
            found: false,
            message: 'No itemized charges available for analysis'
        };
    }

    // Find venipuncture charges
    const venipunctureCharges = data.billLines.filter(line => {
        const codeMatch = VENIPUNCTURE_CODES.includes(line.code);
        const descMatch = VENIPUNCTURE_KEYWORDS.some(keyword =>
            line.description?.toLowerCase().includes(keyword)
        );
        return codeMatch || descMatch;
    });

    if (venipunctureCharges.length === 0) {
        return { found: false };
    }

    // Check if there are lab tests on the same date
    const hasLabTests = data.billLines.some(line => {
        // Check by CPT code pattern
        const codeMatch = LAB_TEST_PATTERNS.some(pattern =>
            pattern.test(line.code)
        );
        // Check by description keywords
        const descMatch = line.description?.toLowerCase().includes('lab') ||
                         line.description?.toLowerCase().includes('test') ||
                         line.description?.toLowerCase().includes('panel');
        return codeMatch || descMatch;
    });

    if (hasLabTests) {
        // Venipuncture should be bundled
        venipunctureCharges.forEach(charge => {
            findings.push({
                lineNumber: charge.lineNumber,
                code: charge.code,
                description: charge.description,
                amount: charge.amount,
                issue: 'Venipuncture separately billed when it should be bundled with lab tests'
            });
            totalSavings += charge.amount;
        });
    }

    if (findings.length > 0) {
        return {
            found: true,
            severity: 'HIGH',
            confidence: 0.95,
            savings: totalSavings,
            findings,
            description: `Venipuncture (blood draw) charges totaling $${totalSavings.toFixed(2)} should be bundled with laboratory tests`,
            recommendation: 'Request removal of separate venipuncture charges as they are included in lab test reimbursement',
            citation: 'CMS National Correct Coding Initiative (NCCI) - Venipuncture is considered integral to lab tests',
            appealText: generateAppealText(findings, totalSavings)
        };
    }

    return { found: false };
}

function generateAppealText(findings, totalSavings) {
    return `I am disputing venipuncture charges on my medical bill. According to CMS guidelines and standard medical billing practices, venipuncture (blood collection) is considered an integral part of laboratory testing and should not be billed separately.

The following charges should be removed:
${findings.map(f => `- ${f.description}: $${f.amount.toFixed(2)}`).join('\n')}

Total disputed amount: $${totalSavings.toFixed(2)}

Please adjust my bill accordingly and provide a corrected statement.`;
}