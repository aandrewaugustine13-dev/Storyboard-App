
import { GoogleGenAI } from "@google/genai";
import { Character, StoryboardPanel, AspectRatio } from "../types";

const STYLE_PROMPT = `STRICT CORE VISUAL STYLE: "The Gibbons/Staples Hybrid"
Every output must strictly adhere to this fusion style:

1. STRUCTURE (The Dave Gibbons Layer):
   - All architecture, machinery, and vehicles MUST have crisp, deliberate ink lines.
   - 2-point or 3-point perspective is mandatory for environments to convey depth and scale.
   - Use heavy "spot blacks" (solid black ink regions) for deep, high-contrast shadows.
   - Aesthetic: Grounded realism, Brutalism, Industrial weight.

2. ATMOSPHERE (The Fiona Staples Layer):
   - NO black outlines on organic elements like smoke, clouds, energy effects, or radiation glow.
   - Coloring must be "painterly" with visible digital brushstrokes and sophisticated blending.
   - High-contrast, volumetric lighting (God-rays, thick atmospheric density).
   - Skin tones must show "subsurface scattering" (subtle redness, veins, bruising beneath the surface).

3. THE PALETTE (Soviet Grimdark):
   - Dominant Colors: Desaturated Concrete Grey, Oxidized Copper Green, Rust Orange.
   - Shadows: Bruised Violet and Deep Umber (Avoid flat neutral blacks; shadows should feel "heavy" and colored).
   - Highlights: Sickly Fluorescent Yellow, Radium Green, Pale Cyan.
   - Texture: All images must imply a 5-10% "1980s Film Grain" for a cinematic, tactile feel.`;

/**
 * Generates a new gallery frame/panel using high-quality gemini-3-pro-image-preview.
 */
export const generateGalleryFrame = async (
  prompt: string, 
  involvedCharacters: Character[],
  previousPanels: StoryboardPanel[],
  aspectRatio: AspectRatio = "16:9"
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Build character consistency context with new deep narrative fields
  const characterContext = involvedCharacters.length > 0 
    ? involvedCharacters.map(c => {
        const visualInfo = c.visualKey ? `Visual description/signature: ${c.visualKey}.` : "";
        return `CHARACTER: ${c.name}
ARCHETYPE: ${c.archetype || 'Unknown'}
MOTIVATION: ${c.motivation || 'Unknown'}
BACKSTORY: ${c.backstory || 'N/A'}
TRAITS: ${c.traits}
VISUAL KEY: ${visualInfo}
ROLE: ${c.description}`;
      }).join('\n\n')
    : "No specific recurring characters.";

  const narrativeHistory = previousPanels.length > 0
    ? `CONTINUITY: The previous sequence showed: ${previousPanels.slice(-2).map(p => p.prompt).join(' then ')}.`
    : "";

  const textPart = {
    text: `
${STYLE_PROMPT}

ACTORS ON SET (STRICT NARRATIVE & VISUAL CONSISTENCY):
${characterContext}

${narrativeHistory}

DIRECTOR'S SCRIPT FOR THIS PANEL:
"${prompt}"

STRICT INSTRUCTION: 
1. Maintain absolute visual consistency for the characters mentioned using their visual signatures and traits.
2. Reflect their current motivation and archetype in their posing, facial expression, and framing. Pose them with "Dave Gibbons" structural weight but "Fiona Staples" expressive emotionality.
3. If reference images are provided, use them as the absolute source of truth for character appearances. 
4. Adhere strictly to the "Gibbons/Staples Hybrid" core style for every element of the composition, including the "Soviet Grimdark" palette and atmospheric lighting.
5. Use ${aspectRatio} framing.`
  };

  // Build parts array for multi-modal generation
  const parts: any[] = [textPart];

  // Add reference images if available
  involvedCharacters.forEach(char => {
    if (char.referenceImage) {
      // Extract data and mimeType from base64 string
      const [header, data] = char.referenceImage.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      
      parts.push({
        inlineData: {
          data,
          mimeType
        }
      });
    }
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize: "1K"
        }
      }
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("Generation blocked by system error.");
    }

    const result = response.candidates[0];
    
    if (result.finishReason === 'SAFETY') {
      throw new Error("Generation blocked for safety reasons. Try refining the prompt.");
    }

    if (result.content?.parts) {
      for (const part of result.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data returned from model.");
  } catch (err: any) {
    console.error("Gemini Service Error:", err);
    throw err;
  }
};
