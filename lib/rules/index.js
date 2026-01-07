/**
 * Wyng 18-Rule Audit Engine
 * Main orchestrator for all billing error detection rules
 */

// Import all individual rules
import R01_PackagedVenipuncture from './R01-packaged-venipuncture.js';
import R02_PackagedIVFluids from './R02-packaged-iv-fluids.js';
import R03_PackagedOTC from './R03-packaged-otc.js';
import R04_Duplicates from './R04-duplicates.js';
import R05_UnlistedDrug from './R05-unlisted-drug.js';
import R06_JCodeUnits from './R06-jcode-units.js';
import R07_ModifierMisuse from './R07-modifier-misuse.js';
import R08_UnbundlingPTP from './R08-unbundling-ptp.js';
import R09_GlobalSurgical from './R09-global-surgical.js';
import R10_TherapyTime from './R10-therapy-time.js';
import R11_ObsInpatient from './R11-obs-inpatient.js';
import R12_RoomBoardLOS from './R12-room-board-los.js';
import R13_TimelyFiling from './R13-timely-filing.js';
import R14_COBMissing from './R14-cob-missing.js';
import R15_EOBZeroBilled from './R15-eob-zero-billed.js';
import R16_MathPosting from './R16-math-posting.js';
import R17_TICOutlier from './R17-tic-outlier.js';
import R18_MissingItemized from './R18-missing-itemized.js';

// Rule registry with metadata
const RULES = [
    { id: 'R01', name: 'Packaged Venipuncture', handler: R01_PackagedVenipuncture, priority: 1 },
    { id: 'R02', name: 'Packaged IV Fluids', handler: R02_PackagedIVFluids, priority: 1 },
    { id: 'R03', name: 'Packaged OTC Medications', handler: R03_PackagedOTC, priority: 1 },
    { id: 'R04', name: 'Duplicate Charges', handler: R04_Duplicates, priority: 2 },
    { id: 'R05', name: 'Unlisted Drug Codes', handler: R05_UnlistedDrug, priority: 2 },
    { id: 'R06', name: 'J-Code Unit Errors', handler: R06_JCodeUnits, priority: 2 },
    { id: 'R07', name: 'Modifier Misuse', handler: R07_ModifierMisuse, priority: 2 },
    { id: 'R08', name: 'Unbundling/PTP Edits', handler: R08_UnbundlingPTP, priority: 3 },
    { id: 'R09', name: 'Global Surgical Package', handler: R09_GlobalSurgical, priority: 3 },
    { id: 'R10', name: 'Therapy Time Units', handler: R10_TherapyTime, priority: 2 },
    { id: 'R11', name: 'Observation vs Inpatient', handler: R11_ObsInpatient, priority: 3 },
    { id: 'R12', name: 'Room & Board LOS', handler: R12_RoomBoardLOS, priority: 2 },
    { id: 'R13', name: 'Timely Filing', handler: R13_TimelyFiling, priority: 3 },
    { id: 'R14', name: 'COB/Primary Missing', handler: R14_COBMissing, priority: 3 },
    { id: 'R15', name: 'EOB Zero Billed Amount', handler: R15_EOBZeroBilled, priority: 1 },
    { id: 'R16', name: 'Math/Posting Errors', handler: R16_MathPosting, priority: 1 },
    { id: 'R17', name: 'TiC Price Outliers', handler: R17_TICOutlier, priority: 3 },
    { id: 'R18', name: 'Missing Itemized Bill', handler: R18_MissingItemized, priority: 1 }
];

/**
 * Main audit runner
 * @param {Object} data - Parsed bill and EOB data
 * @param {Object} insuranceInfo - Insurance plan information
 * @returns {Object} Audit results with findings and savings
 */
export async function runAudit(data, insuranceInfo) {
    console.log('Starting 18-rule audit engine...');

    const findings = [];
    let totalSavings = 0;
    const ruleResults = {};

    // Sort rules by priority
    const sortedRules = [...RULES].sort((a, b) => a.priority - b.priority);

    // Run each rule
    for (const rule of sortedRules) {
        try {
            console.log(`Running ${rule.id}: ${rule.name}`);

            const result = await rule.handler(data, insuranceInfo);

            if (result && result.found) {
                findings.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    ...result
                });

                if (result.savings) {
                    totalSavings += result.savings;
                }
            }

            ruleResults[rule.id] = result || { found: false };

        } catch (error) {
            console.error(`Error in rule ${rule.id}:`, error);
            ruleResults[rule.id] = {
                found: false,
                error: error.message
            };
        }
    }

    // Sort findings by savings amount (highest first)
    findings.sort((a, b) => (b.savings || 0) - (a.savings || 0));

    return {
        success: true,
        totalFindings: findings.length,
        totalSavings,
        findings,
        ruleResults,
        auditDate: new Date().toISOString(),
        confidence: calculateConfidence(findings, data)
    };
}

/**
 * Calculate confidence score based on data quality and findings
 */
function calculateConfidence(findings, data) {
    let score = 100;

    // Reduce confidence if no itemized bill
    if (!data.billLines || data.billLines.length === 0) {
        score -= 20;
    }

    // Reduce confidence if no EOB
    if (!data.eobLines || data.eobLines.length === 0) {
        score -= 15;
    }

    // Reduce confidence if dates don't match well
    if (data.dateDiscrepancy > 30) {
        score -= 10;
    }

    // Increase confidence for high-priority findings
    const highPriorityFindings = findings.filter(f =>
        ['R01', 'R02', 'R03', 'R04', 'R15', 'R16'].includes(f.ruleId)
    );

    if (highPriorityFindings.length > 0) {
        score = Math.min(100, score + 5);
    }

    return Math.max(0, score);
}

export default { runAudit, RULES };