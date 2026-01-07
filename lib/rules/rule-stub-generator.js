/**
 * Generate stub files for remaining rules
 */

const RULE_STUBS = [
    { id: 'R02', name: 'Packaged IV Fluids', desc: 'IV fluids bundled with procedures' },
    { id: 'R03', name: 'Packaged OTC', desc: 'OTC medications charged at extreme markup' },
    { id: 'R05', name: 'Unlisted Drug', desc: 'Unlisted drug codes without proper documentation' },
    { id: 'R06', name: 'J-Code Units', desc: 'Incorrect drug units for J-codes' },
    { id: 'R07', name: 'Modifier Misuse', desc: 'Improper use of CPT modifiers' },
    { id: 'R08', name: 'Unbundling PTP', desc: 'Services that should be bundled per NCCI edits' },
    { id: 'R09', name: 'Global Surgical', desc: 'Post-op care charged separately from surgery' },
    { id: 'R10', name: 'Therapy Time', desc: 'Physical therapy time-based billing errors' },
    { id: 'R11', name: 'Obs Inpatient', desc: 'Observation billed as inpatient' },
    { id: 'R12', name: 'Room Board LOS', desc: 'Room charges exceed length of stay' },
    { id: 'R13', name: 'Timely Filing', desc: 'Claims filed beyond timely filing limits' },
    { id: 'R14', name: 'COB Missing', desc: 'Coordination of benefits not applied' },
    { id: 'R15', name: 'EOB Zero Billed', desc: 'EOB shows $0 billed but patient charged' },
    { id: 'R17', name: 'TIC Outlier', desc: 'Charges exceed TiC negotiated rates' },
    { id: 'R18', name: 'Missing Itemized', desc: 'No itemized bill provided' }
];

function generateStubContent(rule) {
    return `/**
 * Rule ${rule.id}: ${rule.name}
 * ${rule.desc}
 */

export default async function ${rule.id}_${rule.name.replace(/[^a-zA-Z]/g, '')}(data, insuranceInfo) {
    // TODO: Implement ${rule.id} - ${rule.name}
    // This rule detects: ${rule.desc}

    const findings = [];
    let totalSavings = 0;

    // Stub implementation - returns no findings
    // Full implementation will be added based on specific rule logic

    return {
        found: false,
        message: 'Rule ${rule.id} - ${rule.name} (pending implementation)'
    };
}`;
}

// Export for use in creating files
export { RULE_STUBS, generateStubContent };