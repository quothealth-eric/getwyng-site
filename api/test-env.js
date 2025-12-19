// Simple test endpoint to verify environment variables
export default async function handler(req, res) {
    console.log('=== ENV TEST DEBUG ===');
    console.log('Environment variables containing OPENAI:',
        Object.keys(process.env).filter(key => key.includes('OPENAI')));
    console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
    console.log('OPENAI_API_KEY prefix:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');

    return res.status(200).json({
        success: true,
        hasApiKey: !!process.env.OPENAI_API_KEY,
        keyLength: process.env.OPENAI_API_KEY?.length,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
    });
}