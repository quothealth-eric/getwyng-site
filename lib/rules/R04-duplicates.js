/**
 * Rule R04: Duplicate Charges
 * Detects identical or suspiciously similar charges that may be duplicates
 */

export default async function R04_Duplicates(data, insuranceInfo) {
    const findings = [];
    let totalSavings = 0;

    if (!data.billLines || data.billLines.length < 2) {
        return { found: false };
    }

    // Group charges by code and amount for exact duplicates
    const chargeGroups = {};

    data.billLines.forEach((line, index) => {
        const key = `${line.code}_${line.amount}`;
        if (!chargeGroups[key]) {
            chargeGroups[key] = [];
        }
        chargeGroups[key].push({ ...line, index });
    });

    // Find exact duplicates
    Object.entries(chargeGroups).forEach(([key, charges]) => {
        if (charges.length > 1) {
            // Check if duplicates are justified (e.g., bilateral procedures)
            const hasModifiers = charges.some(c =>
                c.modifiers?.includes('50') || // Bilateral
                c.modifiers?.includes('RT') || // Right
                c.modifiers?.includes('LT')    // Left
            );

            if (!hasModifiers) {
                // Likely duplicates - flag all but the first
                for (let i = 1; i < charges.length; i++) {
                    findings.push({
                        lineNumber: charges[i].lineNumber,
                        code: charges[i].code,
                        description: charges[i].description,
                        amount: charges[i].amount,
                        issue: `Duplicate charge (appears ${charges.length} times)`,
                        duplicateOf: charges[0].lineNumber
                    });
                    totalSavings += charges[i].amount;
                }
            }
        }
    });

    // Check for near-duplicates (same code, similar amounts)
    const codeGroups = {};
    data.billLines.forEach(line => {
        if (!codeGroups[line.code]) {
            codeGroups[line.code] = [];
        }
        codeGroups[line.code].push(line);
    });

    Object.entries(codeGroups).forEach(([code, lines]) => {
        if (lines.length > 1) {
            // Sort by amount
            lines.sort((a, b) => b.amount - a.amount);

            // Check for similar amounts (within 10%)
            for (let i = 0; i < lines.length - 1; i++) {
                for (let j = i + 1; j < lines.length; j++) {
                    const diff = Math.abs(lines[i].amount - lines[j].amount);
                    const avgAmount = (lines[i].amount + lines[j].amount) / 2;
                    const percentDiff = (diff / avgAmount) * 100;

                    if (percentDiff < 10 && !isAlreadyFlagged(findings, lines[j].lineNumber)) {
                        findings.push({
                            lineNumber: lines[j].lineNumber,
                            code: lines[j].code,
                            description: lines[j].description,
                            amount: lines[j].amount,
                            issue: `Possible duplicate (similar charge on line ${lines[i].lineNumber})`,
                            confidence: 0.7
                        });
                        // Don't add to savings for near-duplicates (lower confidence)
                    }
                }
            }
        }
    });

    // Check for quantity errors (e.g., qty > 1 when it should be 1)
    data.billLines.forEach(line => {
        if (line.quantity > 1 && isSingleUseItem(line)) {
            const overcharge = line.amount - (line.amount / line.quantity);
            findings.push({
                lineNumber: line.lineNumber,
                code: line.code,
                description: line.description,
                quantity: line.quantity,
                amount: line.amount,
                issue: `Quantity error - charged for ${line.quantity} but likely only 1 used`,
                savings: overcharge
            });
            totalSavings += overcharge;
        }
    });

    if (findings.length > 0) {
        return {
            found: true,
            severity: 'HIGH',
            confidence: 0.9,
            savings: totalSavings,
            findings,
            description: `Found ${findings.length} duplicate or suspicious charges totaling $${totalSavings.toFixed(2)}`,
            recommendation: 'Request itemized bill review and removal of duplicate charges',
            citation: 'Fair and Accurate Credit Transactions Act - Right to dispute billing errors',
            appealText: generateAppealText(findings, totalSavings)
        };
    }

    return { found: false };
}

function isAlreadyFlagged(findings, lineNumber) {
    return findings.some(f => f.lineNumber === lineNumber);
}

function isSingleUseItem(line) {
    const singleUseKeywords = [
        'room',
        'admission',
        'surgery',
        'anesthesia',
        'recovery',
        'consultation'
    ];

    return singleUseKeywords.some(keyword =>
        line.description?.toLowerCase().includes(keyword)
    );
}

function generateAppealText(findings, totalSavings) {
    const exactDuplicates = findings.filter(f => f.duplicateOf);
    const possibleDuplicates = findings.filter(f => !f.duplicateOf && !f.quantity);
    const quantityErrors = findings.filter(f => f.quantity);

    let appealText = `I have identified duplicate and erroneous charges on my medical bill that require correction.\n\n`;

    if (exactDuplicates.length > 0) {
        appealText += `EXACT DUPLICATE CHARGES:\n`;
        exactDuplicates.forEach(f => {
            appealText += `- Line ${f.lineNumber}: ${f.description} ($${f.amount.toFixed(2)}) - duplicate of line ${f.duplicateOf}\n`;
        });
        appealText += '\n';
    }

    if (quantityErrors.length > 0) {
        appealText += `QUANTITY ERRORS:\n`;
        quantityErrors.forEach(f => {
            appealText += `- Line ${f.lineNumber}: ${f.description} - charged for ${f.quantity} units but only 1 was provided\n`;
        });
        appealText += '\n';
    }

    appealText += `Total amount to be removed: $${totalSavings.toFixed(2)}\n\n`;
    appealText += `Please review and correct these billing errors immediately and provide an updated statement.`;

    return appealText;
}