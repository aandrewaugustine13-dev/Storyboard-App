
export interface Character {
  id: string;
  name: string;
  description: string;
  traits: string;
  archetype: string;
  motivation: string;
  backstory: string;
  visualKey?: string; // Specific prompt tokens for visual consistency
  referenceImage?: string; // Base64 encoded reference image
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface StoryboardPanel {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: number;
  charactersInvolved: string[];
  x: number;
  y: number;
  width: number;
  aspectRatio: AspectRatio;
  zIndex: number;
}

export interface Page {
  id: string;
  number: number;
  panels: StoryboardPanel[];
}

export interface Issue {
  id: string;
  title: string;
  pages: Page[];
}

export interface Project {
  id: string;
  name: string;
  issues: Issue[];
  characters: Character[];
  activeIssueId: string;
  activePageId: string;
}
