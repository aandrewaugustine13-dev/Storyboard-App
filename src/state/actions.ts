import { Project, Issue, Panel, Character, TextElement } from '../types';

export type Action =
| { type: 'SET_ACTIVE_PROJECT'; id: string }
| { type: 'ADD_PROJECT'; title: string }
| { type: 'UPDATE_PROJECT'; id: string; updates: Partial<Project> }
| { type: 'UPDATE_PROJECT_FAL_KEY'; projectId: string; apiKey: string }
| { type: 'UPDATE_PROJECT_REPLICATE_KEY'; projectId: string; apiKey: string }
| { type: 'UPDATE_PROJECT_REPLICATE_MODEL'; projectId: string; model: string }
| { type: 'UPDATE_PROJECT_LEONARDO_KEY'; projectId: string; apiKey: string }
| { type: 'DELETE_PROJECT'; id: string }
| { type: 'ADD_ISSUE'; projectId: string; title?: string }
| { type: 'UPDATE_ISSUE'; issueId: string; updates: Partial<Issue> }
| { type: 'DELETE_ISSUE'; issueId: string }
| { type: 'SET_ACTIVE_ISSUE'; id: string }
| { type: 'ADD_PAGE'; issueId: string }
| { type: 'SET_ACTIVE_PAGE'; id: string }
| { type: 'ADD_PANEL'; pageId: string }
| { type: 'UPDATE_PANEL'; panelId: string; updates: Partial<Panel> }
| { type: 'DELETE_PANEL'; panelId: string; pageId: string }
| { type: 'REORDER_PANELS'; pageId: string; panels: Panel[] }
| { type: 'ADD_CHARACTER'; name: string; description: string }
| { type: 'DELETE_CHARACTER'; id: string }
| { type: 'ADD_TEXT_ELEMENT'; panelId: string; element: TextElement }
| { type: 'UPDATE_TEXT_ELEMENT'; panelId: string; elementId: string; updates: Partial<TextElement> }
| { type: 'DELETE_TEXT_ELEMENT'; panelId: string; elementId: string }
| { type: 'IMPORT_ISSUE'; projectId: string; issue: Issue; characters: Character[] };
