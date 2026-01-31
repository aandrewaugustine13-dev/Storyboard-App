import { GoogleGenAI } from "@google/genai";

// Always use process.env.API_KEY directly and create a new instance for each request
export const generateImage = async (
    prompt: string,
    aspectRatio: string,
    initImage?: string,
    strength: number = 0.7
): Promise<string | undefined> => {
    if (initImage) {
        // If an initial image is provided, we use the editImage logic which acts as img2img
        return editImage(initImage, prompt, strength);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any
                }
            }
        });

        // Fix: Iterate through all parts to find the image part as response may contain mixed modalities
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
    } catch (error) {
        console.error("Image generation failed:", error);
        throw error;
    }
    return undefined;
};

export const editImage = async (base64Data: string, editPrompt: string, strength: number = 0.7): Promise<string | undefined> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Strip data:image/png;base64, prefix
    const base64 = base64Data.split(',')[1] || base64Data;

    // Since Gemini 2.5 Flash Image uses vision + text for editing,
    // we use the strength value to modulate the prompt instructions for consistency.
    const influence = strength > 0.75
    ? "Maintain the original composition and character details very strictly."
    : strength < 0.4
    ? "Be very creative and transformative, deviating significantly from the reference structure."
    : "Maintain character consistency and general scene structure.";

    const finalPrompt = `${editPrompt}. ${influence}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64,
                            mimeType: 'image/png'
                        }
                    },
                    { text: finalPrompt }
                ]
            }
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
    } catch (error) {
        console.error("Image editing failed:", error);
        throw error;
    }
    return undefined;
};

export const improvePrompt = async (rawPrompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Improve the following storyboard panel prompt for better image generation. Be descriptive and vivid. Keep it concise. Prompt: ${rawPrompt}`,
        });
        return response.text || rawPrompt;
    } catch (error) {
        return rawPrompt;
    }
};
