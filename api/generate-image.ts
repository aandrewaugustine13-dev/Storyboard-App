// api/generate-image.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, modelId = '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3' } = req.body; // Default to Leonardo Diffusion XL

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt required' });
    }

    const apiKey = process.env.LEONARDO_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Leonardo API key not set—add it in Vercel env vars' });
    }

    try {
        const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                modelId: modelId,
                width: 512,
                height: 512,
                num_images: 1,
                alchemy: false, // Off by default for free tier token savings (turn on for better quality)
            presetStyle: 'CINEMATIC', // Good for storyboard vibes; tweak to 'DYNAMIC' or others
            num_inference_steps: 10, // Low for speed/cost
            guidance_scale: 7.5,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ error: errorData.message || 'Leonardo API call failed—check tokens or prompt' });
        }

        const data = await response.json();
        const generationId = data.sdGenerationJob?.generationId;

        if (!generationId) {
            return res.status(500).json({ error: 'No generation ID returned' });
        }

        // Leonardo needs a quick poll for the image to be ready (usually <10s)
        let attempts = 0;
        let imageUrl = null;
        while (attempts < 5 && !imageUrl) {
            attempts++;
            const pollResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                },
            });

            const pollData = await pollResponse.json();
            if (pollData.generations_by_pk?.generated_images?.[0]?.url) {
                imageUrl = pollData.generations_by_pk.generated_images[0].url;
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
            }
        }

        if (!imageUrl) {
            return res.status(500).json({ error: 'Image not ready after polling—try again or check Leonardo status' });
        }

        res.status(200).json({ imageUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong with the generation' });
    }
}
