// api/generate-flux.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { apiKey, prompt, model = 'black-forest-labs/flux-schnell:b3127d8bc2e4febad86b083287913ef2ec3a51e140bb4f2e329fb2d849b32063' } = req.body;

    if (!apiKey || !prompt) return res.status(400).json({ error: 'Missing apiKey or prompt' });

    try {
        // Create prediction
        const predRes = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: model,
                input: { prompt },
            }),
        });
        const pred = await predRes.json();
        if (pred.error) throw new Error(pred.error);

        // Poll (simple, up to ~60s)
        let output;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            const status = await statusRes.json();
            if (status.status === 'succeeded') { output = status.output?.[0]; break; }
            if (status.status === 'failed') throw new Error(status.error || 'Generation failed');
        }

        if (!output) throw new Error('Timeout');

        res.status(200).json({ imageUrl: output });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
