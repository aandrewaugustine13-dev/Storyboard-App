export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { path, body, method = 'POST' } = req.body;

        if (!path) {
            return res.status(400).json({ error: 'Missing path parameter' });
        }

        // Get API key from environment
        const apiKey = process.env.REPLICATE_API_TOKEN;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const replicateUrl = `https://api.replicate.com/v1${path}`;

        const fetchOptions = {
            method,
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        if (method !== 'GET' && body) {
            fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(replicateUrl, fetchOptions);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.detail || `Replicate API error`
            });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
