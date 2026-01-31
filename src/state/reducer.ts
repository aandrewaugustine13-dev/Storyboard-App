import { Action } from './actions';
import {
    AppState,
    Project,
    Issue,
    Page,
    Panel,
    Character,
    TextElement,
    AspectRatio
} from '../types';
import { genId } from '../utils/helpers';

export function appReducer(state: AppState, action: Action): AppState {
    let newState = { ...state };

    switch (action.type) {
        case 'SET_ACTIVE_PROJECT': {
            const p = state.projects.find(x => x.id === action.id);
            newState = {
                ...state,
                activeProjectId: action.id,
                activeIssueId: p?.issues[0]?.id || null,
                activePageId: p?.issues[0]?.pages[0]?.id || null
            };
            break;
        }

        case 'ADD_PROJECT': {
            const newProj: Project = {
                id: genId(),
                title: action.title,
                style: 'classic-noir',
                issueType: 'issue',
                imageProvider: 'gemini',
                fluxModel: 'fal-ai/flux-pro',
                replicateModel: '776402431718227633f81525a7a72d1a37c4f42065840d21e89f81f1856956f1',
                characters: [],
                issues: [{ id: genId(), title: 'Issue #1', pages: [{ id: genId(), number: 1, panels: [] }] }]
            };
            newState = {
                ...state,
                projects: [...state.projects, newProj],
                activeProjectId: newProj.id,
                activeIssueId: newProj.issues[0].id,
                activePageId: newProj.issues[0].pages[0].id
            };
            break;
        }

        case 'UPDATE_PROJECT':
            newState.projects = state.projects.map(p => p.id === action.id ? { ...p, ...action.updates } : p);
            break;

        case 'UPDATE_PROJECT_FAL_KEY':
            newState.projects = state.projects.map(p => p.id === action.projectId ? { ...p, falApiKey: action.apiKey } : p);
            break;

        case 'UPDATE_PROJECT_REPLICATE_KEY':
            newState.projects = state.projects.map(p => p.id === action.projectId ? { ...p, replicateApiKey: action.apiKey } : p);
            break;

        case 'UPDATE_PROJECT_REPLICATE_MODEL':
            newState.projects = state.projects.map(p => p.id === action.projectId ? { ...p, replicateModel: action.model } : p);
            break;

        case 'UPDATE_PROJECT_LEONARDO_KEY':
            newState.projects = state.projects.map(p => p.id === action.projectId ? { ...p, leonardoApiKey: action.apiKey } : p);
            break;

        case 'DELETE_PROJECT': {
            newState.projects = state.projects.filter(p => p.id !== action.id);
            if (state.activeProjectId === action.id) {
                newState.activeProjectId = newState.projects[0]?.id || null;
            }
            break;
        }

        case 'ADD_ISSUE':
            newState.projects = state.projects.map(proj => {
                if (proj.id !== action.projectId) return proj;
                const typeLabel = proj.issueType === 'issue' ? 'Issue' : 'Chapter';
                const num = proj.issues.length + 1;
                const newIss: Issue = {
                    id: genId(),
                                                   title: action.title || `${typeLabel} #${num}`,
                                                   pages: [{ id: genId(), number: 1, panels: [] }]
                };
                newState.activeIssueId = newIss.id;
                newState.activePageId = newIss.pages[0].id;
                return { ...proj, issues: [...proj.issues, newIss] };
            });
            break;

        case 'UPDATE_ISSUE':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => iss.id === action.issueId ? { ...iss, ...action.updates } : iss)
            }));
            break;

        case 'DELETE_ISSUE':
            newState.projects = state.projects.map(proj => {
                const remaining = proj.issues.filter(i => i.id !== action.issueId);
                if (state.activeIssueId === action.issueId) {
                    newState.activeIssueId = remaining[0]?.id || null;
                    newState.activePageId = remaining[0]?.pages[0]?.id || null;
                }
                return { ...proj, issues: remaining };
            });
            break;

        case 'SET_ACTIVE_ISSUE': {
            const activeP = state.projects.find(proj => proj.issues.some(i => i.id === action.id));
            const activeIss = activeP?.issues.find(i => i.id === action.id);
            newState.activeIssueId = action.id;
            newState.activePageId = activeIss?.pages[0]?.id || null;
            break;
        }

        case 'ADD_PAGE':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => {
                    if (iss.id !== action.issueId) return iss;
                    const newPg: Page = { id: genId(), number: iss.pages.length + 1, panels: [] };
                    newState.activePageId = newPg.id;
                    return { ...iss, pages: [...iss.pages, newPg] };
                })
            }));
            break;

        case 'SET_ACTIVE_PAGE':
            newState.activePageId = action.id;
            break;

        case 'ADD_PANEL':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => ({
                    ...iss,
                    pages: iss.pages.map(pg => {
                        if (pg.id !== action.pageId) return pg;
                        const newPan: Panel = {
                            id: genId(),
                                         prompt: '',
                                         aspectRatio: AspectRatio.WIDE,
                                         characterIds: [],
                                         textElements: []
                        };
                        return { ...pg, panels: [...pg.panels, newPan] };
                    })
                }))
            }));
            break;

        case 'UPDATE_PANEL':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => ({
                    ...iss,
                    pages: iss.pages.map(pg => ({
                        ...pg,
                        panels: pg.panels.map(pan => pan.id === action.panelId ? { ...pan, ...action.updates } : pan)
                    }))
                }))
            }));
            break;

        case 'DELETE_PANEL':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => ({
                    ...iss,
                    pages: iss.pages.map(pg => {
                        if (pg.id !== action.pageId) return pg;
                        return { ...pg, panels: pg.panels.filter(pan => pan.id !== action.panelId) };
                    })
                }))
            }));
            break;

        case 'REORDER_PANELS':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => ({
                    ...iss,
                    pages: iss.pages.map(pg => pg.id === action.pageId ? { ...pg, panels: action.panels } : pg)
                }))
            }));
            break;

        case 'ADD_CHARACTER':
            newState.projects = state.projects.map(proj => {
                if (proj.id !== state.activeProjectId) return proj;
                return {
                    ...proj,
                    characters: [...proj.characters, { id: genId(), name: action.name, description: action.description }]
                };
            });
            break;

        case 'DELETE_CHARACTER':
            newState.projects = state.projects.map(proj => {
                if (proj.id !== state.activeProjectId) return proj;
                return {
                    ...proj,
                    characters: proj.characters.filter(c => c.id !== action.id),
                                                   issues: proj.issues.map(iss => ({
                                                       ...iss,
                                                       pages: iss.pages.map(pg => ({
                                                           ...pg,
                                                           panels: pg.panels.map(pan => ({
                                                               ...pan,
                                                               characterIds: pan.characterIds.filter(id => id !== action.id)
                                                           }))
                                                       }))
                                                   }))
                };
            });
            break;

        case 'ADD_TEXT_ELEMENT':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => ({
                    ...iss,
                    pages: iss.pages.map(pg => ({
                        ...pg,
                        panels: pg.panels.map(pan =>
                        pan.id === action.panelId
                        ? { ...pan, textElements: [...pan.textElements, action.element] }
                        : pan
                        )
                    }))
                }))
            }));
            break;

        case 'UPDATE_TEXT_ELEMENT':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => ({
                    ...iss,
                    pages: iss.pages.map(pg => ({
                        ...pg,
                        panels: pg.panels.map(pan =>
                        pan.id === action.panelId
                        ? {
                            ...pan,
                            textElements: pan.textElements.map(te =>
                            te.id === action.elementId ? { ...te, ...action.updates } : te
                            )
                        }
                        : pan
                        )
                    }))
                }))
            }));
            break;

        case 'DELETE_TEXT_ELEMENT':
            newState.projects = state.projects.map(proj => ({
                ...proj,
                issues: proj.issues.map(iss => ({
                    ...iss,
                    pages: iss.pages.map(pg => ({
                        ...pg,
                        panels: pg.panels.map(pan =>
                        pan.id === action.panelId
                        ? { ...pan, textElements: pan.textElements.filter(te => te.id !== action.elementId) }
                        : pan
                        )
                    }))
                }))
            }));
            break;

        case 'IMPORT_ISSUE':
            newState.projects = state.projects.map(proj => {
                if (proj.id !== action.projectId) return proj;
                return {
                    ...proj,
                    issues: [...proj.issues, action.issue],
                    characters: [
                        ...proj.characters,
                        ...action.characters.filter(
                            newChar => !proj.characters.some(
                                existing => existing.name.toUpperCase() === newChar.name.toUpperCase()
                            )
                        )
                    ]
                };
            });
            newState.activeIssueId = action.issue.id;
            newState.activePageId = action.issue.pages[0]?.id || null;
            break;
    }

    localStorage.setItem('ink_tracker_data', JSON.stringify(newState));
    return newState;
}
