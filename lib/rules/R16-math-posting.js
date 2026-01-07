/**
 * Rule R16: Math and Posting Errors
 * Detects mathematical errors in bill calculations and EOB processing
 */

export default async function R16_MathPosting(data, insuranceInfo) {
    const findings = [];
    let totalSavings = 0;

    // Check bill line item math
    if (data.billLines && data.billLines.length > 0) {
        data.billLines.forEach(line => {
            if (line.quantity && line.unitPrice) {
                const expectedAmount = line.quantity * line.unitPrice;
                const actualAmount = line.amount;

                if (Math.abs(expectedAmount - actualAmount) > 0.01) {
                    findings.push({
                        type: 'LINE_ITEM_MATH',
                        lineNumber: line.lineNumber,
                        description: line.description,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                        expectedAmount,
                        actualAmount,
                        difference: actualAmount - expectedAmount,
                        issue: `Math error: ${line.quantity} × $${line.unitPrice.toFixed(2)} should equal $${expectedAmount.toFixed(2)}, not $${actualAmount.toFixed(2)}`
                    });

                    if (actualAmount > expectedAmount) {
                        totalSavings += actualAmount - expectedAmount;
                    }
                }
            }
        });

        // Check total sum
        const calculatedTotal = data.billLines.reduce((sum, line) => sum + line.amount, 0);
        if (data.billTotal && Math.abs(calculatedTotal - data.billTotal) > 0.01) {
            findings.push({
                type: 'TOTAL_SUM_ERROR',
                calculatedTotal,
                statedTotal: data.billTotal,
                difference: data.billTotal - calculatedTotal,
                issue: `Bill total ($${data.billTotal.toFixed(2)}) doesn't match sum of line items ($${calculatedTotal.toFixed(2)})`
            });

            if (data.billTotal > calculatedTotal) {
                totalSavings += data.billTotal - calculatedTotal;
            }
        }
    }

    // Check EOB calculations
    if (data.eobLines && data.eobLines.length > 0) {
        data.eobLines.forEach(line => {
            // Check allowed amount calculations
            if (line.billedAmount && line.allowedAmount && line.allowedAmount > line.billedAmount) {
                findings.push({
                    type: 'ALLOWED_EXCEEDS_BILLED',
                    lineNumber: line.lineNumber,
                    description: line.description,
                    billedAmount: line.billedAmount,
                    allowedAmount: line.allowedAmount,
                    issue: 'Allowed amount exceeds billed amount (impossible)'
                });
            }

            // Check patient responsibility calculation
            if (line.allowedAmount !== undefined && line.insurancePaid !== undefined) {
                const calculatedPatientResp = line.allowedAmount - line.insurancePaid - (line.adjustment || 0);

                if (line.patientResponsibility !== undefined) {
                    const diff = Math.abs(calculatedPatientResp - line.patientResponsibility);

                    if (diff > 0.01) {
                        findings.push({
                            type: 'PATIENT_RESP_CALC',
                            lineNumber: line.lineNumber,
                            description: line.description,
                            allowedAmount: line.allowedAmount,
                            insurancePaid: line.insurancePaid,
                            adjustment: line.adjustment || 0,
                            calculatedResp: calculatedPatientResp,
                            statedResp: line.patientResponsibility,
                            difference: line.patientResponsibility - calculatedPatientResp,
                            issue: `Patient responsibility miscalculated`
                        });

                        if (line.patientResponsibility > calculatedPatientResp) {
                            totalSavings += line.patientResponsibility - calculatedPatientResp;
                        }
                    }
                }
            }
        });
    }

    // Check deductible and coinsurance application
    if (insuranceInfo && data.eobSummary) {
        // Check if deductible was applied correctly
        if (insuranceInfo.deductible && insuranceInfo.deductibleMet !== undefined) {
            const remainingDeductible = insuranceInfo.deductible - insuranceInfo.deductibleMet;

            if (data.eobSummary.deductibleApplied > remainingDeductible) {
                findings.push({
                    type: 'DEDUCTIBLE_OVERCHARGE',
                    remainingDeductible,
                    appliedDeductible: data.eobSummary.deductibleApplied,
                    excess: data.eobSummary.deductibleApplied - remainingDeductible,
                    issue: `Deductible overcharged by $${(data.eobSummary.deductibleApplied - remainingDeductible).toFixed(2)}`
                });
                totalSavings += data.eobSummary.deductibleApplied - remainingDeductible;
            }
        }

        // Check coinsurance calculation
        if (insuranceInfo.coinsurance && data.eobSummary.coinsuranceAmount) {
            const expectedCoinsurance = (data.eobSummary.allowedAmount - data.eobSummary.deductibleApplied) *
                                        (insuranceInfo.coinsurance / 100);

            if (Math.abs(expectedCoinsurance - data.eobSummary.coinsuranceAmount) > 1) {
                findings.push({
                    type: 'COINSURANCE_ERROR',
                    expectedCoinsurance,
                    actualCoinsurance: data.eobSummary.coinsuranceAmount,
                    difference: data.eobSummary.coinsuranceAmount - expectedCoinsurance,
                    issue: `Coinsurance miscalculated (should be ${insuranceInfo.coinsurance}% of allowed amount after deductible)`
                });

                if (data.eobSummary.coinsuranceAmount > expectedCoinsurance) {
                    totalSavings += data.eobSummary.coinsuranceAmount - expectedCoinsurance;
                }
            }
        }
    }

    if (findings.length > 0) {
        return {
            found: true,
            severity: 'CRITICAL',
            confidence: 1.0, // Math errors are objective
            savings: totalSavings,
            findings,
            description: `Found ${findings.length} mathematical errors totaling $${totalSavings.toFixed(2)} in overcharges`,
            recommendation: 'Request immediate correction of all mathematical errors and recalculation of charges',
            citation: 'Truth in Lending Act, Fair Credit Billing Act - Right to accurate billing',
            appealText: generateAppealText(findings, totalSavings)
        };
    }

    return { found: false };
}

function generateAppealText(findings, totalSavings) {
    let appealText = `I have identified multiple mathematical errors on my medical bill and EOB that require immediate correction.\n\n`;

    const lineItemErrors = findings.filter(f => f.type === 'LINE_ITEM_MATH');
    const totalErrors = findings.filter(f => f.type === 'TOTAL_SUM_ERROR');
    const eobErrors = findings.filter(f => f.type.includes('PATIENT_RESP') || f.type.includes('COINSURANCE') || f.type.includes('DEDUCTIBLE'));

    if (lineItemErrors.length > 0) {
        appealText += `LINE ITEM CALCULATION ERRORS:\n`;
        lineItemErrors.forEach(f => {
            appealText += `- Line ${f.lineNumber}: ${f.issue}\n`;
            appealText += `  Overcharge: $${f.difference.toFixed(2)}\n`;
        });
        appealText += '\n';
    }

    if (totalErrors.length > 0) {
        appealText += `TOTAL CALCULATION ERROR:\n`;
        totalErrors.forEach(f => {
            appealText += `- ${f.issue}\n`;
            appealText += `  Overcharge: $${f.difference.toFixed(2)}\n`;
        });
        appealText += '\n';
    }

    if (eobErrors.length > 0) {
        appealText += `INSURANCE CALCULATION ERRORS:\n`;
        eobErrors.forEach(f => {
            appealText += `- ${f.issue}\n`;
            if (f.difference) {
                appealText += `  Overcharge: $${f.difference.toFixed(2)}\n`;
            }
        });
        appealText += '\n';
    }

    appealText += `TOTAL OVERCHARGE DUE TO MATHEMATICAL ERRORS: $${totalSavings.toFixed(2)}\n\n`;
    appealText += `These are objective mathematical errors that must be corrected. Please recalculate all charges and provide a corrected statement immediately.\n\n`;
    appealText += `If these errors are not corrected within 30 days, I will file complaints with the appropriate regulatory authorities.`;

    return appealText;
}