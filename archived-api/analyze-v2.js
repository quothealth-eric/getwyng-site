// Simplified OpenAI Vision API for bill analysis
import formidable from 'formidable';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('=== ANALYZE V2 API START ===');

    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('No OpenAI API key found');
        return res.status(500).json({
            error: 'Configuration error',
            details: 'OpenAI API key not configured'
        });
    }

    console.log('API key found, length:', apiKey.length);

    try {
        // Parse the form
        const form = new formidable.IncomingForm({
            maxFileSize: 25 * 1024 * 1024,
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

        if (!billFile || !eobFile) {
            return res.status(400).json({
                error: 'Missing files',
                details: 'Both bill and EOB files are required'
            });
        }

        console.log('Files received:', {
            bill: `${billFile.originalFilename} (${billFile.size} bytes)`,
            eob: `${eobFile.originalFilename} (${eobFile.size} bytes)`
        });

        // Read files and convert to base64
        const billBuffer = fs.readFileSync(billFile.filepath);
        const eobBuffer = fs.readFileSync(eobFile.filepath);

        const billBase64 = billBuffer.toString('base64');
        const eobBase64 = eobBuffer.toString('base64');

        console.log('Files converted to base64');

        // Call OpenAI
        console.log('Calling OpenAI API...');

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analyze these medical documents and extract ALL line items.

DOCUMENT 1 - MEDICAL BILL (first image):
Extract each service line with: date, CPT code, description, charge amount

DOCUMENT 2 - EOB (second image):
Extract each line with: date, CPT code, description, billed amount, allowed amount, paid amount, patient responsibility

Then identify any billing errors or discrepancies.

Return JSON with this exact structure:
{
  "billLines": [
    {"date": "MM/DD/YYYY", "code": "CPT", "description": "text", "amount": 0}
  ],
  "eobLines": [
    {"date": "MM/DD/YYYY", "code": "CPT", "description": "text", "billed": 0, "allowed": 0, "paid": 0, "patientOwes": 0}
  ],
  "errors": [
    {"type": "error type", "description": "what's wrong", "savings": 0}
  ],
  "totalBilled": 0,
  "totalPatientOwes": 0,
  "potentialSavings": 0
}`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${billFile.mimetype};base64,${billBase64}`
                                }
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${eobFile.mimetype};base64,${eobBase64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 4096,
                temperature: 0.1
            })
        });

        console.log('OpenAI response status:', openaiResponse.status);

        if (!openaiResponse.ok) {
            const errorBody = await openaiResponse.text();
            console.error('OpenAI error:', errorBody);

            return res.status(openaiResponse.status).json({
                error: `OpenAI API error: ${openaiResponse.status}`,
                details: errorBody
            });
        }

        const openaiData = await openaiResponse.json();
        const content = openaiData.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content in OpenAI response');
        }

        console.log('Parsing OpenAI response...');

        // Parse JSON from response
        let analysis;
        try {
            // Try to extract JSON if it's wrapped in markdown
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
            analysis = JSON.parse(jsonStr);
        } catch (e) {
            console.error('JSON parse error:', e);
            analysis = {
                billLines: [],
                eobLines: [],
                errors: [],
                totalBilled: 0,
                totalPatientOwes: 0,
                potentialSavings: 0
            };
        }

        // Format response for frontend
        const result = {
            caseId: `wyng-${Date.now()}`,
            summary: {
                highLevelFindings: analysis.errors?.map(e => e.description) || ['Analysis complete'],
                potentialSavings_cents: Math.round((analysis.potentialSavings || 0) * 100),
                basis: 'openai-analysis'
            },
            lineAudit: analysis.billLines?.map((line, i) => ({
                lineId: `line-${i}`,
                code: line.code || 'N/A',
                description: line.description || '',
                dos: line.date || '',
                charge_cents: Math.round((line.amount || 0) * 100),
                allowed_cents: null,
                patient_resp_cents: null
            })) || [],
            detections: analysis.errors?.map((error, i) => ({
                ruleKey: `Error ${i + 1}`,
                severity: 'high',
                explanation: error.description,
                actions: ['Review and dispute this charge'],
                savings_cents: Math.round((error.savings || 0) * 100),
                evidence: { lineIds: [] },
                citations: []
            })) || [],
            checklist: [
                'Contact provider about identified errors',
                'Request itemized bill if needed',
                'File appeal with insurance'
            ],
            appealLetter: `Dear Provider/Insurance,

I am requesting a review of my bill based on the following issues:

${analysis.errors?.map(e => `- ${e.description}`).join('\n') || 'No specific errors found'}

Total potential savings: $${analysis.potentialSavings || 0}

Please review and provide a corrected statement.

Sincerely,
[Your Name]`,
            scripts: {
                provider: 'Call provider about billing errors identified',
                payer: 'Call insurance about claim processing issues'
            },
            metadata: {
                processingTime: new Date().toISOString(),
                analysisType: 'OpenAI-Vision',
                documentsProcessed: { bill: true, eob: true }
            }
        };

        console.log('=== ANALYZE V2 SUCCESS ===');
        return res.status(200).json(result);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Analysis failed',
            details: error.message
        });
    }
}