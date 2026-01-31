import {
    AppState,
    Project
} from '../types';

export const createInitialState = (): AppState => {
    const saved = localStorage.getItem('ink_tracker_data');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            parsed.projects.forEach((proj: Project) => {
                if (!proj.issueType) proj.issueType = 'issue';
                if (!proj.imageProvider) proj.imageProvider = 'gemini';
                if (!proj.fluxModel) proj.fluxModel = 'fal-ai/flux-pro';
                if (!proj.replicateModel) proj.replicateModel = '776402431718227633f81525a7a72d1a37c4f42065840d21e89f81f1856956f1';
            proj.issues.forEach(iss => {
                iss.pages.forEach(pg => {
                    pg.panels.forEach(pan => {
                        if (!pan.textElements) pan.textElements = [];
                        if (!pan.characterIds) pan.characterIds = [];
                    });
                });
            });
            });
            return parsed;
        } catch (e) {
            console.error("Load failed", e);
        }
    }

    const defaultProject: Project = {
        id: 'p1',
        title: 'New Story',
        style: 'classic-noir',
        issueType: 'issue',
        imageProvider: 'gemini',
        fluxModel: 'fal-ai/flux-pro',
        replicateModel: '776402431718227633f81525a7a72d1a37c4f42065840d21e89f81f1856956f1',
        characters: [],
        issues: [
            {
                id: 'i1',
                title: 'Issue #1',
                pages: [
                    {
                        id: 'pg1',
                        number: 1,
                        panels: []
                    }
                ]
            }
        ]
    };

    return {
        projects: [defaultProject],
        activeProjectId: 'p1',
        activeIssueId: 'i1',
        activePageId: 'pg1'
    };
};
