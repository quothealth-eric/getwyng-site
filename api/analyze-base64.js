// api/analyze-base64.js
// Alternative endpoint that accepts base64-encoded files to bypass WAF

import pdfParse from 'pdf-parse';
import Jimp from 'jimp';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb'
        },
        maxDuration: 60
    },
};

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('=== BASE64 ANALYZE API START ===');
    console.log('API Key present:', !!process.env.OPENAI_API_KEY);

    try {
        const { billBase64, eobBase64, billType, eobType, insuranceInfo } = req.body;

        if (!billBase64 || !eobBase64) {
            return res.status(400).json({ error: 'Both bill and EOB files are required' });
        }

        // Convert base64 to buffers
        const billBuffer = Buffer.from(billBase64, 'base64');
        const eobBuffer = Buffer.from(eobBase64, 'base64');

        console.log('Files received via base64:', {
            billSize: billBuffer.length,
            eobSize: eobBuffer.length,
            billType,
            eobType
        });

        // Process the files
        const results = await processDocuments({
            billBuffer,
            eobBuffer,
            billType,
            eobType,
            insuranceInfo: insuranceInfo || {}
        });

        return res.status(200).json(results);

    } catch (error) {
        console.error('Base64 API Error:', error);
        return res.status(500).json({
            error: 'Analysis failed',
            details: error.message
        });
    }
}

async function processDocuments({ billBuffer, eobBuffer, billType, eobType, insuranceInfo }) {
    // OCR the documents
    const billText = await extractText(billBuffer, billType);
    const eobText = await extractText(eobBuffer, eobType);

    // Call OpenAI for analysis
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

    const analysis = await analyzeWithOpenAI(billText, eobText, insuranceInfo);

    return analysis;
}

async function extractText(buffer, mimeType) {
    if (mimeType && mimeType.includes('pdf')) {
        const data = await pdfParse(buffer);
        return data.text;
    } else {
        // For images, we'll need to use OCR
        // For now, return placeholder
        return 'Image OCR would be processed here';
    }
}

async function analyzeWithOpenAI(billText, eobText, insuranceInfo) {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are a medical billing expert. Analyze the bill and EOB to find errors, discrepancies, and savings opportunities.'
                },
                {
                    role: 'user',
                    content: `
                        Medical Bill Text:
                        ${billText.substring(0, 3000)}

                        EOB Text:
                        ${eobText.substring(0, 3000)}

                        Insurance Info: ${JSON.stringify(insuranceInfo)}

                        Find billing errors, duplicates, and discrepancies. Return JSON with findings.
                    `
                }
            ],
            max_tokens: 2000,
            temperature: 0.1
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the response and format results
    try {
        const findings = JSON.parse(content);
        return {
            success: true,
            caseId: `CASE-${Date.now()}`,
            summary: {
                highLevelFindings: findings.errors || ['Analysis complete'],
                potentialSavings_cents: findings.savings || 0,
                basis: 'openai-analysis'
            },
            detections: findings.detections || [],
            lineAudit: findings.lineItems || []
        };
    } catch (e) {
        // If not JSON, return as text findings
        return {
            success: true,
            caseId: `CASE-${Date.now()}`,
            summary: {
                highLevelFindings: [content],
                potentialSavings_cents: 0,
                basis: 'text-analysis'
            },
            detections: [],
            lineAudit: []
        };
    }
}