// Simplified OpenAI-only bill analysis API
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('=== SIMPLE ANALYSIS API ===');

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY not found');
        return res.status(500).json({
            error: 'Configuration error',
            details: 'OpenAI API key not configured in environment'
        });
    }

    try {
        // Parse form data
        const { IncomingForm } = await import('formidable');
        const fs = await import('fs');

        const form = new IncomingForm({
            maxFileSize: 25 * 1024 * 1024, // 25MB
            allowEmptyFiles: false,
        });

        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    console.error('Form parse error:', err);
                    reject(err);
                } else {
                    resolve({ fields, files });
                }
            });
        });

        const billFile = files.bill?.[0];
        const eobFile = files.eob?.[0];
        const insuranceInfo = JSON.parse(fields.insuranceInfo?.[0] || '{}');

        console.log('Files received:', {
            bill: billFile ? `${billFile.originalFilename} (${billFile.size} bytes)` : 'none',
            eob: eobFile ? `${eobFile.originalFilename} (${eobFile.size} bytes)` : 'none'
        });

        if (!billFile || !eobFile) {
            return res.status(400).json({ error: 'Both bill and EOB files are required' });
        }

        // Convert files to base64 for OpenAI Vision
        console.log('Converting files to base64...');
        const billBuffer = fs.default.readFileSync(billFile.filepath);
        const eobBuffer = fs.default.readFileSync(eobFile.filepath);

        const billBase64 = billBuffer.toString('base64');
        const eobBase64 = eobBuffer.toString('base64');

        console.log('Calling OpenAI GPT-4o Vision API...');

        // Prepare OpenAI request
        const messages = [
            {
                role: 'system',
                content: 'You are an expert medical billing auditor. Analyze medical bills and EOBs to find errors and savings opportunities.'
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `Analyze these medical documents:

1. MEDICAL BILL (first image/document)
2. EOB - Explanation of Benefits (second image/document)

Extract ALL line items from both documents with:
- Date of service
- CPT/HCPCS code (like 99213, 36415, etc.)
- Service description
- Billed amount
- Allowed amount (from EOB)
- Insurance paid (from EOB)
- Patient responsibility

Then identify:
1. Billing errors (duplicate charges, incorrect codes, unbundling)
2. Insurance processing errors
3. Discrepancies between bill and EOB
4. Potential savings opportunities

Return a detailed JSON analysis with this structure:
{
  "billLines": [
    {
      "date": "MM/DD/YYYY",
      "code": "CPT code",
      "description": "service description",
      "billedAmount": number,
      "units": number
    }
  ],
  "eobLines": [
    {
      "date": "MM/DD/YYYY",
      "code": "CPT code",
      "description": "service description",
      "billedAmount": number,
      "allowedAmount": number,
      "insurancePaid": number,
      "patientResponsibility": number
    }
  ],
  "findings": [
    {
      "type": "error|discrepancy|opportunity",
      "severity": "high|medium|low",
      "description": "Clear explanation",
      "affectedCodes": ["CPT codes"],
      "potentialSavings": number,
      "recommendation": "Specific action to take"
    }
  ],
  "summary": {
    "totalBilled": number,
    "totalAllowed": number,
    "totalPatientResponsibility": number,
    "potentialSavings": number,
    "issuesFound": number
  }
}`
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${billFile.mimetype};base64,${billBase64}`,
                            detail: 'high'
                        }
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${eobFile.mimetype};base64,${eobBase64}`,
                            detail: 'high'
                        }
                    }
                ]
            }
        ];

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: messages,
                max_tokens: 4096,
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);

            if (response.status === 401) {
                return res.status(401).json({
                    error: 'Authentication failed',
                    details: 'Invalid OpenAI API key'
                });
            }

            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No response from OpenAI');
        }

        console.log('OpenAI analysis complete');

        // Parse the JSON response
        const analysis = JSON.parse(content);

        // Format the response for the frontend
        const formattedResults = {
            caseId: `analysis-${Date.now()}`,
            summary: {
                highLevelFindings: analysis.findings?.map(f => f.description) || [],
                potentialSavings_cents: Math.round((analysis.summary?.potentialSavings || 0) * 100),
                basis: 'openai-vision-analysis'
            },
            lineAudit: analysis.billLines?.map((line, idx) => {
                const eobLine = analysis.eobLines?.find(e => e.code === line.code);
                return {
                    lineId: `bill-${idx}`,
                    code: line.code,
                    description: line.description,
                    dos: line.date,
                    charge_cents: Math.round((line.billedAmount || 0) * 100),
                    allowed_cents: eobLine ? Math.round((eobLine.allowedAmount || 0) * 100) : null,
                    patient_resp_cents: eobLine ? Math.round((eobLine.patientResponsibility || 0) * 100) : null
                };
            }) || [],
            detections: analysis.findings?.map((finding, idx) => ({
                ruleKey: `Finding ${idx + 1}: ${finding.type}`,
                severity: finding.severity,
                explanation: finding.description,
                actions: [finding.recommendation],
                savings_cents: Math.round((finding.potentialSavings || 0) * 100),
                evidence: { lineIds: finding.affectedCodes || [] },
                citations: [{ authority: 'OpenAI Analysis', title: 'GPT-4o Vision Review' }]
            })) || [],
            checklist: analysis.findings?.map(f => f.recommendation) || [],
            appealLetter: generateAppealLetter(analysis),
            scripts: {
                provider: generateProviderScript(analysis),
                payer: generatePayerScript(analysis)
            },
            metadata: {
                processingTime: new Date().toISOString(),
                analysisType: 'OpenAI Vision Only',
                documentsProcessed: { bill: true, eob: true }
            }
        };

        console.log('Returning formatted results');
        return res.status(200).json(formattedResults);

    } catch (error) {
        console.error('Analysis error:', error.message);
        return res.status(500).json({
            error: 'Analysis failed',
            details: error.message
        });
    }
}

function generateAppealLetter(analysis) {
    const findings = analysis.findings?.slice(0, 3) || [];
    const findingsText = findings.map((f, i) =>
        `${i + 1}. ${f.description}\n   Potential saving: $${(f.potentialSavings || 0).toFixed(2)}\n   Action: ${f.recommendation}`
    ).join('\n\n');

    return `Dear Claims Review Team,

I am writing to request a review of my medical bill based on a comprehensive analysis that identified potential billing discrepancies.

Analysis Summary:
- Total billed: $${(analysis.summary?.totalBilled || 0).toFixed(2)}
- Issues identified: ${analysis.summary?.issuesFound || 0}
- Potential savings: $${(analysis.summary?.potentialSavings || 0).toFixed(2)}

Key Issues Identified:
${findingsText}

I request that you review these findings and provide a corrected bill if errors are confirmed. Please respond within 30 days with your determination.

Thank you for your attention to this matter.

Sincerely,
[Your Name]`;
}

function generateProviderScript(analysis) {
    const topIssue = analysis.findings?.[0];
    return `"Hello, I'm calling about my bill dated [date]. I've had a professional review that identified ${analysis.summary?.issuesFound || 0} potential billing issues. The most significant is: ${topIssue?.description || 'billing discrepancies'}. This could result in savings of $${(topIssue?.potentialSavings || 0).toFixed(2)}. Can you please review this and provide a corrected statement?"`;
}

function generatePayerScript(analysis) {
    return `"Hi, I'm calling about claim [number] for services on [date]. A billing audit identified ${analysis.summary?.issuesFound || 0} processing issues totaling $${(analysis.summary?.potentialSavings || 0).toFixed(2)} in potential overcharges. Can you please reprocess this claim with the corrections?"`;
}