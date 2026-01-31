export enum AspectRatio {
    WIDE = 'wide',
    STD = 'std',
    SQUARE = 'square',
    TALL = 'tall',
    PORTRAIT = 'portrait'
}

export interface Character {
    id: string;
    name: string;
    description: string;
}

export type TextElementType = 'dialogue' | 'thought' | 'caption' | 'phone';

export interface TextElement {
    id: string;
    type: TextElementType;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    color: string;
    backgroundColor?: string;
    tailDirection?: 'left' | 'right' | 'bottom' | 'none';
    rotation?: number;
    tailX?: number;
    tailY?: number;
    tailStyle?: 'pointy' | 'cloud' | 'none';
}

export interface Panel {
    id: string;
    prompt: string;
    imageUrl?: string;
    aspectRatio: AspectRatio;
    notes?: string;
    characterIds: string[];
    textElements: TextElement[];
    referencePanelId?: string;
    referenceStrength?: number;
    title?: string;
}

export interface Page {
    id: string;
    number: number;
    panels: Panel[];
}

export interface Issue {
    id: string;
    title: string;
    pages: Page[];
}

export type ImageProvider = 'gemini' | 'fal-flux' | 'replicate-flux' | 'leonardo';

export interface Project {
    id: string;
    title: string;
    style: string;
    issueType: 'issue' | 'chapter';
    imageProvider: ImageProvider;
    togetherApiKey?: string;
    falApiKey?: string;
    replicateApiKey?: string;
    replicateModel?: string;
    leonardoApiKey?: string;
    fluxModel?: string;
    issues: Issue[];
    characters: Character[];
}

export interface AppState {
    projects: Project[];
    activeProjectId: string | null;
    activeIssueId: string | null;
    activePageId: string | null;
}
