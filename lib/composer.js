/**
 * Report Composer
 * Generates audit reports, appeal letters, and phone scripts
 */

/**
 * Generate the preview report (free version)
 */
export function generatePreview(auditResults, pricing) {
    const { totalFindings, totalSavings, findings } = auditResults;

    // Get top 2 findings for preview
    const previewFindings = findings.slice(0, 2);

    return {
        type: 'preview',
        summary: {
            totalFindings,
            totalSavings,
            price: pricing.price,
            savingsRatio: pricing.savingsRatio
        },
        teaserFindings: previewFindings.map(f => ({
            ruleName: f.ruleName,
            savings: f.savings,
            description: truncateDescription(f.description, 100),
            severity: f.severity
        })),
        callToAction: {
            headline: `Found ${totalFindings} issues worth $${totalSavings.toFixed(2)}`,
            subheadline: `Get your complete audit report for just ${pricing.displayPrice}`,
            benefits: [
                'Detailed explanations for all findings',
                'Ready-to-send appeal letter',
                'Phone scripts for providers and insurance',
                'Regulatory citations for each issue',
                '30-day money-back guarantee'
            ]
        }
    };
}

/**
 * Generate the full paid report
 */
export function generateFullReport(auditResults, insuranceInfo, patientInfo = {}) {
    const { findings, totalSavings, confidence } = auditResults;

    return {
        type: 'full',
        generatedAt: new Date().toISOString(),
        patient: sanitizePatientInfo(patientInfo),
        insurance: insuranceInfo,
        summary: {
            totalFindings: findings.length,
            totalSavings,
            confidence,
            highPriorityCount: findings.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL').length
        },
        findings: findings.map(formatFinding),
        appealLetter: generateAppealLetter(findings, totalSavings, patientInfo),
        providerScript: generateProviderScript(findings, totalSavings),
        insuranceScript: generateInsuranceScript(findings, totalSavings),
        actionChecklist: generateActionChecklist(findings),
        regulatoryCitations: compileRegulatoryCitations(findings),
        nextSteps: generateNextSteps(findings, totalSavings)
    };
}

/**
 * Generate appeal letter
 */
function generateAppealLetter(findings, totalSavings, patientInfo) {
    const date = new Date().toLocaleDateString();
    const highPriority = findings.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL');

    let letter = `[Your Name]\n`;
    letter += `[Your Address]\n`;
    letter += `[City, State ZIP]\n`;
    letter += `[Phone Number]\n`;
    letter += `[Email Address]\n\n`;

    letter += `${date}\n\n`;

    letter += `[Hospital/Provider Billing Department]\n`;
    letter += `[Address]\n`;
    letter += `[City, State ZIP]\n\n`;

    letter += `Re: Billing Dispute - Account #[Your Account Number]\n`;
    letter += `    Patient: [Your Name]\n`;
    letter += `    Date(s) of Service: [Service Dates]\n\n`;

    letter += `Dear Billing Department:\n\n`;

    letter += `I am writing to formally dispute charges on my medical bill dated [Bill Date]. `;
    letter += `After a thorough review, I have identified ${findings.length} billing errors `;
    letter += `totaling $${totalSavings.toFixed(2)} in overcharges.\n\n`;

    if (highPriority.length > 0) {
        letter += `CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:\n\n`;
        highPriority.forEach((finding, index) => {
            letter += `${index + 1}. ${finding.ruleName}\n`;
            letter += `   ${finding.description}\n`;
            letter += `   Amount: $${finding.savings.toFixed(2)}\n`;
            if (finding.citation) {
                letter += `   Reference: ${finding.citation}\n`;
            }
            letter += `\n`;
        });
    }

    letter += `SPECIFIC BILLING ERRORS:\n\n`;
    findings.forEach((finding, index) => {
        letter += `Issue ${index + 1}: ${finding.ruleName}\n`;
        if (finding.appealText) {
            letter += finding.appealText + '\n';
        } else {
            letter += `${finding.description}\n`;
            letter += `Overcharge: $${finding.savings.toFixed(2)}\n`;
        }
        letter += `\n`;
    });

    letter += `REQUESTED ACTIONS:\n\n`;
    letter += `1. Review and correct all identified billing errors\n`;
    letter += `2. Remove overcharges totaling $${totalSavings.toFixed(2)}\n`;
    letter += `3. Provide an updated, itemized statement\n`;
    letter += `4. Confirm in writing that corrections have been made\n\n`;

    letter += `Under the Fair Credit Billing Act and state consumer protection laws, I have the right `;
    letter += `to dispute billing errors. I request that you investigate these issues within 30 days `;
    letter += `and provide a written response.\n\n`;

    letter += `If these errors are not corrected, I will:\n`;
    letter += `- File complaints with the state insurance commissioner\n`;
    letter += `- Report to the Consumer Financial Protection Bureau\n`;
    letter += `- Seek legal counsel for violations of billing regulations\n\n`;

    letter += `I look forward to your prompt response and resolution of these billing errors.\n\n`;

    letter += `Sincerely,\n\n\n`;
    letter += `[Your Signature]\n`;
    letter += `[Your Typed Name]\n\n`;

    letter += `Enclosures:\n`;
    letter += `- Copy of original bill\n`;
    letter += `- Copy of EOB\n`;
    letter += `- Detailed audit findings\n`;

    return letter;
}

/**
 * Generate provider phone script
 */
function generateProviderScript(findings, totalSavings) {
    return {
        introduction: `Hello, I'm calling about billing errors on my account. I've identified ${findings.length} issues totaling $${totalSavings.toFixed(2)} in overcharges.`,

        keyPoints: [
            'I have a detailed audit showing specific billing errors',
            'I need these corrected before I can pay',
            'Can you help me resolve this, or should I speak with a supervisor?'
        ],

        specificIssues: findings.slice(0, 3).map(f => ({
            issue: f.ruleName,
            explanation: f.description,
            amount: f.savings
        })),

        questions: [
            'Can you see the itemized charges on my account?',
            'Who can authorize corrections to my bill?',
            'What is the process for billing disputes?',
            'Can you email me confirmation of any changes made?'
        ],

        escalation: 'If they cannot help: "I need to speak with a billing supervisor who can authorize corrections to my account."',

        documentation: [
            'Get the representative\'s name and ID',
            'Ask for a reference number for this call',
            'Request email confirmation of any agreements',
            'Take detailed notes with timestamps'
        ]
    };
}

/**
 * Generate insurance phone script
 */
function generateInsuranceScript(findings, totalSavings) {
    return {
        introduction: `Hello, I need help with incorrect processing on my EOB. The provider is billing me for charges that should be covered or adjusted.`,

        keyPoints: [
            'I have documentation showing billing errors',
            'Some charges violate our contract terms',
            'I need you to reprocess these claims correctly'
        ],

        claimIssues: findings.filter(f => f.insuranceRelated).map(f => ({
            issue: f.ruleName,
            explanation: f.description,
            expectedAction: 'Reprocess with correct calculation'
        })),

        questions: [
            'Can you see all the claim details on your system?',
            'Why was my deductible/coinsurance calculated this way?',
            'Can you reprocess the claim with corrections?',
            'What is the appeals process if you cannot fix this now?'
        ],

        requestActions: [
            'Please reprocess the claim with correct calculations',
            'Send me a corrected EOB',
            'Notify the provider of the corrections',
            'Provide a reference number for this request'
        ]
    };
}

/**
 * Generate action checklist
 */
function generateActionChecklist(findings) {
    const checklist = [
        { task: 'Review the complete audit report', priority: 'HIGH', completed: false },
        { task: 'Gather original bill and EOB documents', priority: 'HIGH', completed: false },
        { task: 'Customize the appeal letter with your information', priority: 'HIGH', completed: false }
    ];

    // Add specific tasks based on findings
    if (findings.some(f => f.severity === 'CRITICAL')) {
        checklist.push({
            task: 'Call billing department immediately about critical errors',
            priority: 'CRITICAL',
            completed: false
        });
    }

    checklist.push(
        { task: 'Send appeal letter via certified mail', priority: 'HIGH', completed: false },
        { task: 'Call provider billing department', priority: 'MEDIUM', completed: false },
        { task: 'Contact insurance if EOB errors exist', priority: 'MEDIUM', completed: false },
        { task: 'Document all communications', priority: 'HIGH', completed: false },
        { task: 'Follow up if no response in 30 days', priority: 'MEDIUM', completed: false }
    );

    return checklist;
}

/**
 * Compile regulatory citations
 */
function compileRegulatoryCitations(findings) {
    const citations = new Set();

    findings.forEach(f => {
        if (f.citation) {
            citations.add(f.citation);
        }
    });

    return Array.from(citations).map(citation => ({
        citation,
        description: getRegulationDescription(citation)
    }));
}

/**
 * Helper functions
 */
function truncateDescription(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

function sanitizePatientInfo(info) {
    // Remove sensitive data from patient info
    const { ssn, ...safeInfo } = info;
    return safeInfo;
}

function formatFinding(finding) {
    return {
        ...finding,
        formattedSavings: `$${finding.savings.toFixed(2)}`,
        severityLabel: getSeverityLabel(finding.severity),
        confidenceLabel: getConfidenceLabel(finding.confidence)
    };
}

function getSeverityLabel(severity) {
    const labels = {
        'CRITICAL': '🔴 Critical',
        'HIGH': '🟠 High',
        'MEDIUM': '🟡 Medium',
        'LOW': '🟢 Low'
    };
    return labels[severity] || severity;
}

function getConfidenceLabel(confidence) {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Moderate';
    return 'Low';
}

function getRegulationDescription(citation) {
    const regulations = {
        'CMS National Correct Coding Initiative': 'Federal guidelines for proper medical coding and billing',
        'Fair Credit Billing Act': 'Federal law protecting consumers from unfair billing practices',
        'Truth in Lending Act': 'Federal law requiring clear disclosure of credit terms',
        'Fair and Accurate Credit Transactions Act': 'Federal law providing rights to dispute billing errors'
    };

    for (const [key, value] of Object.entries(regulations)) {
        if (citation.includes(key)) {
            return value;
        }
    }

    return 'Healthcare billing regulation';
}

function generateNextSteps(findings, totalSavings) {
    const steps = [];

    if (totalSavings > 1000) {
        steps.push('Consider consulting with a medical billing advocate for high-value dispute');
    }

    if (findings.some(f => f.severity === 'CRITICAL')) {
        steps.push('Address critical errors immediately - these are clear violations');
    }

    steps.push(
        'Send appeal letter within 30 days',
        'Keep all original documents',
        'Document every interaction',
        'Be persistent - appeals often require follow-up'
    );

    return steps;
}

export default {
    generatePreview,
    generateFullReport
};