// Simple test to verify OpenAI API key works
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST');

    console.log('Testing OpenAI API key...');

    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
            error: 'No API key found',
            details: 'OPENAI_API_KEY not in environment'
        });
    }

    try {
        // Simple test with GPT-4o
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
                        role: 'user',
                        content: 'Reply with just: API key works!'
                    }
                ],
                max_tokens: 10
            })
        });

        const responseText = await response.text();
        console.log('OpenAI response status:', response.status);
        console.log('OpenAI response:', responseText);

        if (!response.ok) {
            return res.status(response.status).json({
                error: `OpenAI API returned ${response.status}`,
                details: responseText,
                keyInfo: {
                    length: process.env.OPENAI_API_KEY.length,
                    prefix: process.env.OPENAI_API_KEY.substring(0, 7)
                }
            });
        }

        const data = JSON.parse(responseText);
        return res.status(200).json({
            success: true,
            message: 'OpenAI API key is working!',
            response: data.choices?.[0]?.message?.content
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Test failed',
            details: error.message
        });
    }
}