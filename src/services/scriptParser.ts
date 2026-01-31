import { AspectRatio } from '../types';

export type VisualMarker = 'standard' | 'echo' | 'hitch' | 'overflow' | 'shattered' | 'split' | 'splash';

export interface ParsedBubble {
    type: 'dialogue' | 'caption' | 'thought' | 'sfx';
    text: string;
    character?: string;
}

export interface ParsedPanel {
    panelNumber: number;
    description: string;
    bubbles: ParsedBubble[];
    artistNotes: string[];
    visualMarker: VisualMarker;
    aspectRatio: AspectRatio;
}

export interface ParsedPage {
    pageNumber: number;
    panels: ParsedPanel[];
}

export interface ParsedCharacter {
    name: string;
    lineCount: number;
    firstAppearance?: string;
}

export interface ParseResult {
    success: boolean;
    pages: ParsedPage[];
    characters: ParsedCharacter[];
    errors: string[];
    warnings: string[];
}

// Patterns
const PAGE_PATTERN = /^(?:PAGE|PG)\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|TWENTY[- ]?ONE|TWENTY[- ]?TWO|TWENTY[- ]?THREE|TWENTY[- ]?FOUR|TWENTY[- ]?FIVE|TWENTY[- ]?SIX|TWENTY[- ]?SEVEN|TWENTY[- ]?EIGHT|\d+)(?:\s*[:\-\.])?/i;

// Flexible Panel detection: "Panel 1", "P1", "1.", "FRAME 1", "Panel One"
const PANEL_PATTERN = /^(?:PANEL|P|FRAME|FR|BLOCK)\s*(\d+)\s*(?:\[([^\]]+)\]|\(([^)]+)\))?(?:\s*[:\-\.])?\s*(.*)/i;
const NUMERIC_PANEL_START = /^(\d+)\.\s*(.*)/;

// Dialogue patterns: "NAME: text", "NAME (MOD): text", "NAME - text", "NAME — text"
const DIALOGUE_PATTERN = /^([A-Z][A-Z0-9\s\-'\.]{1,25})(?:\s*[\(\[<]([^\)\]>]+)[\)\]>])?\s*[:\-\—]\s*(.+)$/;

// Marvel/DC style keys
const DESC_KEY_PATTERN = /^(?:Description|Action|Visuals)\s*:\s*(.*)/i;
const CAPTION_PATTERN = /^(?:CAPTION|NARRATION|NARRATOR|VO|V\.O\.|OFF-SCREEN|O\.S\.)\s*[:\-\—]\s*(.+)$/i;
const SFX_PATTERN = /^(?:SFX|SOUND)\s*[:\-\—]\s*(.+)$/i;
const ARTIST_NOTE_PATTERN = /^(?:Artist\s*note|NOTE|PROMPT|REF)\s*[:\-\—]\s*(.+)$/i;
const TITLE_PATTERN = /^TITLE(?:\s*\([^)]*\))?\s*[:\-\—]\s*(.+)$/i;

const WORD_TO_NUM: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'twenty-one': 21, 'twentyone': 21, 'twenty one': 21,
    'twenty-two': 22, 'twentytwo': 22, 'twenty two': 22,
};

function parsePageNumber(str: string): number {
    const cleaned = str.toLowerCase().trim().replace(/[-\s]+/g, '');
    for (const [word, num] of Object.entries(WORD_TO_NUM)) {
        if (cleaned === word.replace(/[-\s]+/g, '')) return num;
    }
    const num = parseInt(str, 10);
    return isNaN(num) ? 0 : num;
}

function detectVisualMarker(text: string, modifiers: string): VisualMarker {
    const combined = `${text} ${modifiers}`.toLowerCase();
    if (combined.includes('echo') || combined.includes('shatter') || combined.includes('fracture')) return 'echo';
    if (combined.includes('hitch') || combined.includes('stutter') || combined.includes('smear')) return 'hitch';
    if (combined.includes('overflow') || combined.includes('bruise') || combined.includes('lattice')) return 'overflow';
    if (combined.includes('split')) return 'split';
    if (combined.includes('splash') || combined.includes('full-page') || combined.includes('full page')) return 'splash';
    if (combined.includes('shattered')) return 'shattered';
    return 'standard';
}

function detectAspectRatio(description: string): AspectRatio {
    const lower = description.toLowerCase();
    if (lower.includes('wide') || lower.includes('landscape') || lower.includes('double') || lower.includes('establishing') || lower.includes('panoramic') || lower.includes('16:9')) return AspectRatio.WIDE;
    if (lower.includes('tall') || lower.includes('vertical') || lower.includes('9:16')) return AspectRatio.PORTRAIT;
    if (lower.includes('close') || lower.includes('face') || lower.includes('portrait') || lower.includes('4:3')) return AspectRatio.STD;
    if (lower.includes('square') || lower.includes('1:1')) return AspectRatio.SQUARE;
    if (lower.includes('large panel') || lower.includes('splash')) return AspectRatio.WIDE;
    return AspectRatio.WIDE;
}

export function parseScript(scriptText: string): ParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const pages: ParsedPage[] = [];
    const characterMap = new Map<string, { count: number; first: string }>();

    try {
        const normalizedText = scriptText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ');

        const allLines = normalizedText.split('\n');

        let currentPageNumber = 0;
        let currentPagePanels: ParsedPanel[] = [];
        let currentPanelNumber = 0;
        let currentPanelDescription = '';
        let currentPanelModifiers = '';
        let currentPanelBubbles: ParsedBubble[] = [];
        let currentPanelArtistNotes: string[] = [];

        // Track if the previous line was a potential character name (for indented dialogue)
        let pendingCharacter: string | null = null;

        const saveCurrentPanel = () => {
            if (currentPanelNumber > 0) {
                if (currentPanelDescription.trim() || currentPanelBubbles.length > 0) {
                    const visualMarker = detectVisualMarker(currentPanelDescription, currentPanelModifiers);
                    const aspectRatio = detectAspectRatio(currentPanelDescription);

                    currentPagePanels.push({
                        panelNumber: currentPanelNumber,
                        description: currentPanelDescription.trim(),
                                           bubbles: [...currentPanelBubbles],
                                           artistNotes: [...currentPanelArtistNotes],
                                           visualMarker,
                                           aspectRatio,
                    });
                }
            }
            currentPanelDescription = '';
            currentPanelModifiers = '';
            currentPanelBubbles = [];
            currentPanelArtistNotes = [];
            pendingCharacter = null;
        };

        const saveCurrentPage = () => {
            saveCurrentPanel();
            if (currentPageNumber > 0 && currentPagePanels.length > 0) {
                pages.push({
                    pageNumber: currentPageNumber,
                    panels: [...currentPagePanels],
                });
            }
            currentPagePanels = [];
        };

        for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i].trim();
            const rawLine = allLines[i];
            if (!line) {
                pendingCharacter = null;
                continue;
            }

            // Page detection
            const pageMatch = line.match(PAGE_PATTERN);
            if (pageMatch) {
                saveCurrentPage();
                currentPageNumber = parsePageNumber(pageMatch[1]);
                continue;
            }

            // Panel detection
            const panelMatch = line.match(PANEL_PATTERN) || line.match(NUMERIC_PANEL_START);
            if (panelMatch) {
                saveCurrentPanel();
                if (panelMatch.length > 2 && panelMatch[1] && !line.match(NUMERIC_PANEL_START)) {
                    currentPanelNumber = parseInt(panelMatch[1], 10);
                    currentPanelModifiers = (panelMatch[2] || panelMatch[3] || '').trim();
                    currentPanelDescription = (panelMatch[4] || '').trim();
                } else {
                    currentPanelNumber = parseInt(panelMatch[1], 10);
                    currentPanelDescription = (panelMatch[2] || '').trim();
                }
                continue;
            }

            // Inside a panel, parse content
            if (currentPanelNumber > 0) {
                // Artist note
                const artistMatch = line.match(ARTIST_NOTE_PATTERN);
                if (artistMatch) {
                    currentPanelArtistNotes.push(artistMatch[1].trim());
                    continue;
                }

                // Caption
                const captionMatch = line.match(CAPTION_PATTERN);
                if (captionMatch) {
                    currentPanelBubbles.push({ type: 'caption', text: captionMatch[1].trim() });
                    continue;
                }

                // SFX
                const sfxMatch = line.match(SFX_PATTERN);
                if (sfxMatch) {
                    currentPanelBubbles.push({ type: 'sfx', text: sfxMatch[1].trim() });
                    continue;
                }

                // Action/Description Key (Marvel Style)
                const descKeyMatch = line.match(DESC_KEY_PATTERN);
                if (descKeyMatch) {
                    currentPanelDescription += " " + descKeyMatch[1].trim();
                    continue;
                }

                // Title
                const titleMatch = line.match(TITLE_PATTERN);
                if (titleMatch) {
                    currentPanelBubbles.push({ type: 'caption', text: `TITLE: ${titleMatch[1].trim()}` });
                    continue;
                }

                // Indented dialogue handling (Style A)
                // If the line is indented and we have a pending character, it's likely dialogue
                if (pendingCharacter && (rawLine.startsWith('  ') || rawLine.startsWith('\t'))) {
                    const text = line.trim();
                    const existing = characterMap.get(pendingCharacter);
                    if (existing) existing.count++; else characterMap.set(pendingCharacter, { count: 1, first: currentPanelDescription });

                    currentPanelBubbles.push({
                        type: 'dialogue',
                        text,
                        character: pendingCharacter,
                    });
                    continue;
                }

                // Dialogue standard: "NAME: text"
                const dialogueMatch = line.match(DIALOGUE_PATTERN);
                if (dialogueMatch) {
                    const [, character, modifier, text] = dialogueMatch;
                    const charName = character.trim().toUpperCase();
                    const lowerMod = (modifier || '').toLowerCase();
                    const isThought = lowerMod.includes('thought') || lowerMod.includes('inner');

                    const existing = characterMap.get(charName);
                    if (existing) existing.count++; else characterMap.set(charName, { count: 1, first: currentPanelDescription });

                    currentPanelBubbles.push({
                        type: isThought ? 'thought' : 'dialogue',
                        text: text.trim(),
                                             character: charName,
                    });
                    pendingCharacter = null;
                    continue;
                }

                // Potential character line (All caps, short, followed by indented text or just identifying for Style A)
                if (/^[A-Z][A-Z\s\-']{1,25}$/.test(line)) {
                    pendingCharacter = line.trim().toUpperCase();
                    continue;
                }

                // Fallback: append to description
                if (currentPanelDescription) {
                    currentPanelDescription += ' ' + line;
                } else {
                    currentPanelDescription = line;
                }
            }
        }

        saveCurrentPage();

        if (pages.length === 0) {
            errors.push('No story structure detected. Ensure pages start with "PAGE 1" and panels with "Panel 1" or "1."');
            return { success: false, pages: [], characters: [], errors, warnings };
        }

        pages.sort((a, b) => a.pageNumber - b.pageNumber);

        const characters: ParsedCharacter[] = Array.from(characterMap.entries())
        .map(([name, data]) => ({
            name,
            lineCount: data.count,
            firstAppearance: data.first
        }))
        .filter(c => !['CAPTION', 'SFX', 'TITLE', 'SUBTITLE', 'TEXT', 'NARRATION', 'DESCRIPTION', 'ACTION', 'SOUND'].includes(c.name.toUpperCase()))
        .sort((a, b) => b.lineCount - a.lineCount);

        return { success: true, pages, characters, errors, warnings };

    } catch (error) {
        errors.push(`Parser exception: ${error instanceof Error ? error.message : 'Unknown'}`);
        return { success: false, pages: [], characters: [], errors, warnings };
    }
}
