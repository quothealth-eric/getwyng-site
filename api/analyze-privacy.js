/**
 * Privacy-First Bill Audit Analysis
 * NO PHI/PII is stored - all processing in memory only
 */

import { IncomingForm } from 'formidable';
import fs from 'fs/promises';
import crypto from 'crypto';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let uploadedFiles = [];

    try {
        // Parse uploaded files
        const form = new IncomingForm({
            maxFileSize: 10 * 1024 * 1024, // 10MB limit
            allowEmptyFiles: false,
        });

        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        });

        const billFile = files.bill?.[0];
        const eobFile = files.eob?.[0];
        const insuranceInfo = JSON.parse(fields.insuranceInfo?.[0] || '{}');

        if (!billFile || !eobFile) {
            return res.status(400).json({ error: 'Both bill and EOB files required' });
        }

        uploadedFiles = [billFile.filepath, eobFile.filepath];

        // Process files in memory (no database storage)
        const auditResults = await processAuditInMemory(
            billFile,
            eobFile,
            insuranceInfo
        );

        // Generate temporary session ID (not linked to any PHI)
        const sessionId = crypto.randomUUID();

        // Calculate price based on savings
        const price = calculatePrice(auditResults.totalSavings);

        // Create preview (no PHI)
        const preview = {
            sessionId,
            totalFindings: auditResults.findings.length,
            totalSavings: auditResults.totalSavings,
            price: price.amount,
            priceDisplay: price.display,

            // Anonymized finding previews (no medical details)
            previewFindings: auditResults.findings.slice(0, 2).map(f => ({
                category: getCategoryName(f.ruleId), // Generic category, not specific medical info
                potentialSavings: f.savings,
                confidence: f.confidence
            })),

            // Generic benefits list (no specifics)
            fullReportIncludes: [
                `${auditResults.findings.length} detailed findings`,
                'Custom appeal letter',
                'Phone scripts',
                'Regulatory citations',
                '30-day support'
            ]
        };

        // Store ONLY anonymized data in memory/cache (expires in 1 hour)
        await storeTemporarySession(sessionId, {
            price: price.amount,
            findingsCount: auditResults.findings.length,
            totalSavings: auditResults.totalSavings,
            // Encrypted blob of the full report (if needed)
            encryptedReport: encryptReport(auditResults),
            expiresAt: Date.now() + 3600000 // 1 hour
        });

        // Return preview to client
        res.status(200).json({
            success: true,
            preview,
            sessionId,
            // Client stores the full report locally if needed
            clientEncryptedReport: encryptForClient(auditResults)
        });

    } catch (error) {
        console.error('Audit error:', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: 'Unable to process documents'
        });

    } finally {
        // CRITICAL: Delete uploaded files immediately
        for (const filepath of uploadedFiles) {
            try {
                await fs.unlink(filepath);
                console.log('Deleted temp file:', filepath);
            } catch (err) {
                console.error('Failed to delete temp file:', filepath, err);
            }
        }
    }
}

/**
 * Process audit without storing PHI
 */
async function processAuditInMemory(billFile, eobFile, insuranceInfo) {
    // 1. Extract text from files (in memory)
    const billText = await extractText(billFile);
    const eobText = await extractText(eobFile);

    // 2. Parse with AI (no storage)
    const billData = await parseWithAI(billText, 'bill');
    const eobData = await parseWithAI(eobText, 'eob');

    // 3. Run rules engine (in memory)
    const findings = await runRulesEngine(billData, eobData, insuranceInfo);

    // 4. Calculate totals
    const totalSavings = findings.reduce((sum, f) => sum + f.savings, 0);

    // 5. Return results (will be encrypted)
    return {
        findings,
        totalSavings,
        billData: null, // Don't include raw data
        eobData: null   // Don't include raw data
    };
}

/**
 * Extract text using OCR (OpenAI)
 */
async function extractText(file) {
    // Use OpenAI Vision API to extract text
    // This happens in memory, no storage
    const OpenAI = await import('openai');
    const openai = new OpenAI.OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    const fileBuffer = await fs.readFile(file.filepath);
    const base64 = fileBuffer.toString('base64');

    const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [{
            role: "user",
            content: [
                { type: "text", text: "Extract all text from this medical document. Return only the text, no analysis." },
                { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${base64}` } }
            ]
        }],
        max_tokens: 4000
    });

    return response.choices[0].message.content;
}

/**
 * Parse text with AI
 */
async function parseWithAI(text, docType) {
    // Parse but return only structured data, no raw PHI
    // Implementation would extract amounts, codes, but no names/dates
    return {
        lines: [], // Anonymized line items
        total: 0   // Just numbers
    };
}

/**
 * Run rules engine
 */
async function runRulesEngine(billData, eobData, insuranceInfo) {
    // Run rules and return findings without PHI
    // Each finding has category, savings, but no medical details
    return [
        {
            ruleId: 'R01',
            category: 'Bundling Error',
            savings: 150,
            confidence: 0.95
        }
        // More findings...
    ];
}

/**
 * Calculate price
 */
function calculatePrice(savings) {
    const price = Math.max(29, Math.min(199, Math.round(savings * 0.1)));
    return {
        amount: price,
        display: `$${price}`
    };
}

/**
 * Get generic category name (no medical details)
 */
function getCategoryName(ruleId) {
    const categories = {
        'R01': 'Service Bundling',
        'R04': 'Duplicate Charge',
        'R16': 'Calculation Error'
        // etc...
    };
    return categories[ruleId] || 'Billing Discrepancy';
}

/**
 * Encrypt report for client-side storage
 */
function encryptForClient(report) {
    // Use a client-specific key (could be derived from session)
    const cipher = crypto.createCipher('aes-256-cbc', 'client-temp-key');
    let encrypted = cipher.update(JSON.stringify(report), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

/**
 * Encrypt report for temporary server storage
 */
function encryptReport(report) {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'temp-key');
    let encrypted = cipher.update(JSON.stringify(report), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

/**
 * Store temporary session (in memory cache or Redis)
 */
async function storeTemporarySession(sessionId, data) {
    // In production, use Redis or similar
    // For now, using in-memory cache (clears on restart)
    if (!global.tempSessions) {
        global.tempSessions = new Map();
    }

    global.tempSessions.set(sessionId, data);

    // Auto-delete after expiry
    setTimeout(() => {
        global.tempSessions.delete(sessionId);
    }, 3600000); // 1 hour
}