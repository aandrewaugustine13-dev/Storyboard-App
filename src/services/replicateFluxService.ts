import { AspectRatio } from "../types";

interface ReplicatePrediction {
    id: string;
    status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
    output?: string | string[];
    error?: string;
}

const ASPECT_RATIO_MAP: Record<string, string> = {
    [AspectRatio.WIDE]: "16:9",
    [AspectRatio.STD]: "4:3",
    [AspectRatio.SQUARE]: "1:1",
    [AspectRatio.TALL]: "3:4",
    [AspectRatio.PORTRAIT]: "9:16",
};

async function callReplicateAPI<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    method: string = 'POST'
): Promise<T> {
    const response = await fetch('/api/replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: endpoint,
            body: data,
            method
        }),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || `API request failed`);
    }
    return result as T;
}

export async function generateFluxImage(
    prompt: string,
    aspectRatio: AspectRatio | string,
    _apiKey?: string,
    _model?: string,
    initImage?: string,
    strength: number = 0.7
): Promise<string> {
    const isImg2Img = !!initImage;
    const version = isImg2Img
    ? "8bb04ca03d368e597c554a938c4b2b1a8d052d3a958e0a294d13e9a597a731b9"
    : "776402431718227633f81525a7a72d1a37c4f42065840d21e89f81f1856956f1";

    const replicateAspectRatio = ASPECT_RATIO_MAP[aspectRatio as AspectRatio] || "1:1";

    const input: Record<string, unknown> = {
        prompt: prompt.trim(),
        num_outputs: 1,
        output_format: "png",
        guidance_scale: 3.5,
        num_inference_steps: 28,
    };

    if (isImg2Img && initImage) {
        input.image = initImage;
        input.prompt_strength = Math.max(0.1, Math.min(1, strength));
    } else {
        input.aspect_ratio = replicateAspectRatio;
    }

    // 1. Create prediction
    const prediction = await callReplicateAPI<ReplicatePrediction>('/predictions', {
        version,
        input
    });

    if (prediction.error) {
        throw new Error(`Replicate Error: ${prediction.error}`);
    }

    const predictionId = prediction.id;

    // 2. Poll for completion
    const pollInterval = 2000;
    const maxPollTime = 180000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const statusCheck = await callReplicateAPI<ReplicatePrediction>(
            `/predictions/${predictionId}`,
            undefined,
            'GET'
        );

        if (statusCheck.status === 'succeeded') {
            const output = statusCheck.output;
            const imageUrl = Array.isArray(output) ? output[0] : output;

            if (!imageUrl || typeof imageUrl !== 'string') {
                throw new Error('Invalid image URL in response');
            }

            return imageUrl;
        } else if (statusCheck.status === 'failed' || statusCheck.status === 'canceled') {
            const errorMsg = statusCheck.error || 'Unknown error';
            throw new Error(`Generation ${statusCheck.status}: ${errorMsg}`);
        }
    }

    throw new Error('Generation timed out');
}
