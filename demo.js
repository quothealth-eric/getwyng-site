/**
 * Wyng Bill Audit Demo Application
 * Terminal-themed interface for the 18-rule audit engine
 */

class WyngAuditDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.state = {
            step: 1,
            billFile: null,
            eobFile: null,
            insuranceInfo: {
                payer: '',
                state: '',
                planType: '',
                deductible: 0,
                deductibleMet: 0,
                coinsurance: 20,
                oopMax: 0,
                oopSpent: 0,
                copay: 0
            },
            results: null,
            processing: false
        };
        this.init();
    }

    init() {
        this.render();
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    render() {
        const { step } = this.state;

        let content = '';

        // Step indicator
        content += this.renderStepIndicator();

        // Current step content
        switch(step) {
            case 1:
                content += this.renderUploadStep();
                break;
            case 2:
                content += this.renderInsuranceStep();
                break;
            case 3:
                content += this.renderProcessingStep();
                break;
            case 4:
                content += this.renderResultsStep();
                break;
        }

        this.container.innerHTML = content;
        this.attachEventListeners();
    }

    renderStepIndicator() {
        const { step } = this.state;
        const steps = [
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Insurance' },
            { num: 3, label: 'Analyze' },
            { num: 4, label: 'Results' }
        ];

        return `
            <div class="demo-steps">
                ${steps.map(s => `
                    <div class="demo-step ${s.num < step ? 'completed' : ''} ${s.num === step ? 'active' : ''}">
                        <span class="demo-step-number">${s.num < step ? '✓' : s.num}</span>
                        <span class="demo-step-label">${s.label}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderUploadStep() {
        const { billFile, eobFile } = this.state;

        return `
            <div class="upload-step">
                <p class="dim" style="margin-bottom: 20px;">
                    Upload your itemized medical bill and Explanation of Benefits (EOB) to begin the audit.
                </p>

                <div class="demo-row" style="gap: 24px;">
                    <div class="upload-zone ${billFile ? 'has-file' : ''}" id="bill-upload">
                        <div class="upload-zone-icon">📄</div>
                        <div class="upload-zone-label">
                            ${billFile ? '' : 'Drop BILL here or click to browse'}
                        </div>
                        ${billFile ? `<div class="upload-zone-file">✓ ${billFile.name}</div>` : ''}
                        <input type="file" id="bill-input" accept=".pdf,.png,.jpg,.jpeg" style="display:none;">
                    </div>

                    <div class="upload-zone ${eobFile ? 'has-file' : ''}" id="eob-upload">
                        <div class="upload-zone-icon">📋</div>
                        <div class="upload-zone-label">
                            ${eobFile ? '' : 'Drop EOB here or click to browse'}
                        </div>
                        ${eobFile ? `<div class="upload-zone-file">✓ ${eobFile.name}</div>` : ''}
                        <input type="file" id="eob-input" accept=".pdf,.png,.jpg,.jpeg" style="display:none;">
                    </div>
                </div>

                <div class="demo-actions">
                    <div></div>
                    <button class="demo-btn demo-btn-primary" id="next-btn" ${!billFile || !eobFile ? 'disabled' : ''}>
                        NEXT →
                    </button>
                </div>
            </div>
        `;
    }

    renderInsuranceStep() {
        const { insuranceInfo } = this.state;

        const payers = ['UnitedHealthcare', 'Aetna', 'Cigna', 'Anthem/BCBS', 'Humana', 'Kaiser', 'Other'];
        const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
        const planTypes = ['PPO', 'HMO', 'EPO', 'POS', 'HDHP', 'Other'];

        return `
            <div class="insurance-step">
                <p class="dim" style="margin-bottom: 20px;">
                    Enter your insurance details to calculate accurate savings estimates.
                </p>

                <div class="demo-row">
                    <div class="demo-form-group">
                        <label class="demo-label">Payer/Insurance</label>
                        <select class="demo-select" id="payer-select">
                            <option value="">Select payer...</option>
                            ${payers.map(p => `<option value="${p}" ${insuranceInfo.payer === p ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                    </div>

                    <div class="demo-form-group">
                        <label class="demo-label">State</label>
                        <select class="demo-select" id="state-select">
                            <option value="">Select state...</option>
                            ${states.map(s => `<option value="${s}" ${insuranceInfo.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="demo-form-group">
                    <label class="demo-label">Plan Type</label>
                    <select class="demo-select" id="plan-type-select">
                        <option value="">Select plan type...</option>
                        ${planTypes.map(p => `<option value="${p}" ${insuranceInfo.planType === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>

                <div class="demo-row">
                    <div class="demo-form-group">
                        <label class="demo-label">Annual Deductible ($)</label>
                        <input type="number" class="demo-input" id="deductible-input"
                            placeholder="e.g., 1500" value="${insuranceInfo.deductible || ''}">
                    </div>

                    <div class="demo-form-group">
                        <label class="demo-label">Deductible Met YTD ($)</label>
                        <input type="number" class="demo-input" id="deductible-met-input"
                            placeholder="e.g., 500" value="${insuranceInfo.deductibleMet || ''}">
                    </div>
                </div>

                <div class="demo-row">
                    <div class="demo-form-group">
                        <label class="demo-label">Coinsurance (your %)</label>
                        <input type="number" class="demo-input" id="coinsurance-input"
                            placeholder="e.g., 20" value="${insuranceInfo.coinsurance || ''}">
                    </div>

                    <div class="demo-form-group">
                        <label class="demo-label">Copay ($, if applicable)</label>
                        <input type="number" class="demo-input" id="copay-input"
                            placeholder="e.g., 50" value="${insuranceInfo.copay || ''}">
                    </div>
                </div>

                <div class="demo-row">
                    <div class="demo-form-group">
                        <label class="demo-label">Out-of-Pocket Maximum ($)</label>
                        <input type="number" class="demo-input" id="oop-max-input"
                            placeholder="e.g., 6000" value="${insuranceInfo.oopMax || ''}">
                    </div>

                    <div class="demo-form-group">
                        <label class="demo-label">OOP Spent YTD ($)</label>
                        <input type="number" class="demo-input" id="oop-spent-input"
                            placeholder="e.g., 1200" value="${insuranceInfo.oopSpent || ''}">
                    </div>
                </div>

                <div class="demo-actions">
                    <button class="demo-btn demo-btn-secondary" id="back-btn">
                        ← BACK
                    </button>
                    <button class="demo-btn demo-btn-primary" id="analyze-btn">
                        ANALYZE →
                    </button>
                </div>
            </div>
        `;
    }

    renderProcessingStep() {
        const steps = [
            { id: 'upload', label: 'Uploading documents' },
            { id: 'ocr', label: 'Running OCR extraction' },
            { id: 'parse-bill', label: 'Parsing bill line items' },
            { id: 'parse-eob', label: 'Parsing EOB details' },
            { id: 'match', label: 'Matching bill ↔ EOB lines' },
            { id: 'rules', label: 'Running 18-rule audit engine' },
            { id: 'savings', label: 'Calculating potential savings' },
            { id: 'report', label: 'Generating report' }
        ];

        return `
            <div class="processing-step-container">
                <div class="processing-steps">
                    ${steps.map((s, i) => `
                        <div class="processing-step" id="step-${s.id}">
                            <span class="processing-step-icon">[ ]</span>
                            <span>${s.label}...</span>
                        </div>
                    `).join('')}
                </div>

                <div class="processing-bar">
                    <div class="processing-bar-fill" id="progress-bar" style="width: 0%"></div>
                </div>
            </div>
        `;
    }

    renderResultsStep() {
        const { results } = this.state;

        if (!results) {
            return `<p class="dim">No results available.</p>`;
        }

        return `
            <div class="results-container">
                <!-- Summary -->
                <div class="results-section">
                    <div class="results-section-title">═══ SUMMARY ═══</div>
                    <ul style="list-style: none; padding: 0;">
                        ${results.summary.highLevelFindings.map(f => `
                            <li style="margin: 8px 0;">• ${f}</li>
                        `).join('')}
                    </ul>
                    ${results.summary.potentialSavings_cents ? `
                        <p style="margin-top: 16px; font-size: 1.1rem;">
                            <span class="highlight-green">Estimated Savings: $${(results.summary.potentialSavings_cents / 100).toFixed(2)}</span>
                            <span class="dim"> (${results.summary.basis}-basis)</span>
                        </p>
                    ` : ''}
                </div>

                <!-- Findings -->
                <div class="results-section">
                    <div class="results-section-title">═══ FINDINGS ═══</div>
                    ${results.detections.length === 0 ? `
                        <p class="highlight-green">✓ No issues detected! Your bill appears accurate.</p>
                    ` : results.detections.map(d => `
                        <div class="finding ${d.severity}">
                            <div class="finding-header">
                                <span class="finding-severity ${d.severity}">${d.severity.toUpperCase()}</span>
                                <span class="finding-rule">${d.ruleKey}</span>
                            </div>
                            <div class="finding-description">${d.explanation}</div>
                            ${d.savings_cents ? `
                                <div class="finding-savings">Potential refund: $${(d.savings_cents / 100).toFixed(2)}</div>
                            ` : ''}
                            <div class="finding-actions">
                                <strong>Actions:</strong>
                                <ul style="margin: 4px 0 0 16px;">
                                    ${d.actions.map(a => `<li>${a}</li>`).join('')}
                                </ul>
                            </div>
                            ${d.citations && d.citations.length > 0 ? `
                                <div class="finding-citation">
                                    📚 ${d.citations.map(c => `${c.authority}: ${c.title}`).join('; ')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>

                <!-- Line Audit Table -->
                <div class="results-section">
                    <div class="results-section-title">═══ LINE-BY-LINE AUDIT ═══</div>
                    <div style="overflow-x: auto;">
                        <table class="audit-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Description</th>
                                    <th>Charge</th>
                                    <th>Allowed</th>
                                    <th>Patient Resp</th>
                                    <th>Flags</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${results.lineAudit.map(line => `
                                    <tr>
                                        <td>${line.code || '—'}</td>
                                        <td>${line.description || '—'}</td>
                                        <td>${line.charge_cents ? '$' + (line.charge_cents / 100).toFixed(2) : '—'}</td>
                                        <td>${line.allowed_cents ? '$' + (line.allowed_cents / 100).toFixed(2) : '—'}</td>
                                        <td>${line.patient_resp_cents_bill ? '$' + (line.patient_resp_cents_bill / 100).toFixed(2) : '—'}</td>
                                        <td class="${line.rulesTriggered && line.rulesTriggered.length > 0 ? 'flag high' : ''}">${line.rulesTriggered ? line.rulesTriggered.join(', ') : '✓'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Checklist -->
                <div class="results-section">
                    <div class="results-section-title">═══ NEXT STEPS CHECKLIST ═══</div>
                    ${results.checklist.map(item => `
                        <div class="checklist-item">
                            <div class="checklist-checkbox"></div>
                            <div>${item}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Appeal Letter -->
                <div class="results-section">
                    <div class="results-section-title">═══ APPEAL LETTER (Ready to Send) ═══</div>
                    <div class="appeal-letter" id="appeal-letter">${results.appealLetter}</div>
                </div>

                <!-- Phone Scripts -->
                <div class="results-section">
                    <div class="results-section-title">═══ PHONE SCRIPTS ═══</div>
                    <div class="script-tabs">
                        <button class="script-tab active" data-script="provider">Provider Script</button>
                        <button class="script-tab" data-script="payer">Payer Script</button>
                    </div>
                    <div class="script-content" id="script-content">${results.scripts.provider}</div>
                </div>

                <!-- Actions -->
                <div class="results-actions">
                    <button class="demo-btn demo-btn-primary" id="download-pdf-btn">
                        📥 Download Full Report (PDF)
                    </button>
                    <button class="demo-btn demo-btn-secondary" id="copy-letter-btn">
                        📋 Copy Appeal Letter
                    </button>
                    <button class="demo-btn demo-btn-secondary" id="new-audit-btn">
                        🔄 Start New Audit
                    </button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const { step } = this.state;

        if (step === 1) {
            this.setupUploadZone('bill-upload', 'bill-input', 'billFile');
            this.setupUploadZone('eob-upload', 'eob-input', 'eobFile');

            const nextBtn = document.getElementById('next-btn');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.setState({ step: 2 }));
            }
        }

        if (step === 2) {
            this.setupFormListeners();

            const backBtn = document.getElementById('back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.setState({ step: 1 }));
            }

            const analyzeBtn = document.getElementById('analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.addEventListener('click', () => this.runAnalysis());
            }
        }

        if (step === 4) {
            document.querySelectorAll('.script-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.script-tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    const scriptType = e.target.dataset.script;
                    document.getElementById('script-content').textContent =
                        this.state.results.scripts[scriptType];
                });
            });

            const copyBtn = document.getElementById('copy-letter-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(this.state.results.appealLetter);
                    copyBtn.textContent = '✓ Copied!';
                    setTimeout(() => copyBtn.textContent = '📋 Copy Appeal Letter', 2000);
                });
            }

            const downloadBtn = document.getElementById('download-pdf-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => this.downloadPdf());
            }

            const newBtn = document.getElementById('new-audit-btn');
            if (newBtn) {
                newBtn.addEventListener('click', () => {
                    this.state = {
                        step: 1,
                        billFile: null,
                        eobFile: null,
                        insuranceInfo: {
                            payer: '',
                            state: '',
                            planType: '',
                            deductible: 0,
                            deductibleMet: 0,
                            coinsurance: 20,
                            oopMax: 0,
                            oopSpent: 0,
                            copay: 0
                        },
                        results: null,
                        processing: false
                    };
                    this.render();
                });
            }
        }
    }

    setupUploadZone(zoneId, inputId, stateKey) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);

        if (!zone || !input) return;

        zone.addEventListener('click', () => input.click());

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                this.setState({ [stateKey]: file });
            }
        });

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.setState({ [stateKey]: file });
            }
        });
    }

    setupFormListeners() {
        const fields = [
            { id: 'payer-select', key: 'payer' },
            { id: 'state-select', key: 'state' },
            { id: 'plan-type-select', key: 'planType' },
            { id: 'deductible-input', key: 'deductible', type: 'number' },
            { id: 'deductible-met-input', key: 'deductibleMet', type: 'number' },
            { id: 'coinsurance-input', key: 'coinsurance', type: 'number' },
            { id: 'copay-input', key: 'copay', type: 'number' },
            { id: 'oop-max-input', key: 'oopMax', type: 'number' },
            { id: 'oop-spent-input', key: 'oopSpent', type: 'number' }
        ];

        fields.forEach(field => {
            const el = document.getElementById(field.id);
            if (el) {
                el.addEventListener('change', (e) => {
                    const value = field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                    this.state.insuranceInfo[field.key] = value;
                });
            }
        });
    }

    async runAnalysis() {
        this.setState({ step: 3, processing: true });

        await new Promise(r => setTimeout(r, 100));

        const steps = ['upload', 'ocr', 'parse-bill', 'parse-eob', 'match', 'rules', 'savings', 'report'];
        const progressBar = document.getElementById('progress-bar');

        for (let i = 0; i < steps.length; i++) {
            const stepEl = document.getElementById(`step-${steps[i]}`);
            if (stepEl) {
                stepEl.classList.add('active');
                stepEl.querySelector('.processing-step-icon').textContent = '[▸]';
            }

            if (progressBar) {
                progressBar.style.width = `${((i + 1) / steps.length) * 100}%`;
            }

            await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

            if (stepEl) {
                stepEl.classList.remove('active');
                stepEl.classList.add('completed');
                stepEl.querySelector('.processing-step-icon').textContent = '[✓]';
            }
        }

        try {
            const formData = new FormData();
            formData.append('bill', this.state.billFile);
            formData.append('eob', this.state.eobFile);
            formData.append('insuranceInfo', JSON.stringify(this.state.insuranceInfo));

            const response = await fetch('/api/analyze-simple', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const results = await response.json();

            // DEBUG: Log the full response to console for investigation
            console.log('=== API RESPONSE DEBUG ===');
            console.log('Response status:', response.status);
            console.log('Full results:', JSON.stringify(results, null, 2));
            console.log('Line audit codes:', results.lineAudit?.map(l => l.code));
            console.log('Detection rules:', results.detections?.map(d => d.ruleKey));
            console.log('=== END DEBUG ===');

            // Add debug info to results for display
            if (results && results.metadata) {
                results.metadata.debugInfo = {
                    responseTime: new Date().toISOString(),
                    responseStatus: response.status,
                    analysisType: results.metadata.analysisType || 'unknown'
                };
            }

            this.setState({ step: 4, results, processing: false });

        } catch (error) {
            console.error('Analysis error:', error);

            // Try to get more details from the response
            let errorDetails = error.message;
            if (error.response) {
                try {
                    const errorText = await error.response.text();
                    errorDetails += `\nAPI Response: ${errorText}`;
                } catch (e) {
                    errorDetails += `\nResponse Status: ${error.response.status} ${error.response.statusText}`;
                }
            }

            // Show detailed error instead of mock data
            this.setState({
                step: 4,
                results: {
                    caseId: 'error-' + Date.now(),
                    summary: {
                        highLevelFindings: ['DEBUGGING: Document processing failed - see details below'],
                        potentialSavings_cents: 0,
                        basis: 'error'
                    },
                    lineAudit: [],
                    detections: [{
                        ruleKey: 'DEBUG INFO',
                        severity: 'high',
                        explanation: `Full error details: ${errorDetails}`,
                        actions: [
                            'Check Vercel function logs',
                            'Verify OpenAI API key is set',
                            'Check uploaded file format and size'
                        ],
                        savings_cents: 0,
                        evidence: { lineIds: [] },
                        citations: [{ authority: 'Debug', title: 'Error Investigation' }]
                    }],
                    checklist: [
                        'Check browser console for additional error details',
                        'Verify files are valid PDFs or images under 25MB',
                        'Try different documents to isolate the issue',
                        `Error occurred at: ${new Date().toISOString()}`
                    ],
                    appealLetter: `DEBUGGING INFORMATION:\n\nError occurred during document processing.\n\nError details: ${errorDetails}\n\nTimestamp: ${new Date().toISOString()}\n\nThis information can help debug the issue.`,
                    scripts: {
                        provider: 'DEBUG: Document processing failed - see error details in appeal letter',
                        payer: 'DEBUG: Document processing failed - see error details in appeal letter'
                    },
                    citations: []
                },
                processing: false
            });
        }
    }


    async downloadPdf() {
        const btn = document.getElementById('download-pdf-btn');
        btn.textContent = 'Generating...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: this.state.results })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `wyng-audit-report-${this.state.results.caseId}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                throw new Error('PDF generation not available');
            }
        } catch (error) {
            console.error('PDF download error:', error);
            alert('PDF generation coming soon! For now, you can copy the appeal letter or use your browser\'s Print to PDF feature.');
        }

        btn.textContent = '📥 Download Full Report (PDF)';
        btn.disabled = false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('demo-app')) {
        window.wyngDemo = new WyngAuditDemo('demo-app');
    }
});