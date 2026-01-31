import React, { useState, useEffect } from 'react';
import { AppState, Project } from '../types';
import { Action } from '../state/actions';
import { Icons } from '../constants';

interface ProjectHubProps {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    onClose: () => void;
}

const ProjectHub: React.FC<ProjectHubProps> = ({ state, dispatch, onClose }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [localApiKey, setLocalApiKey] = useState<string>('');
    const [localReplicateKey, setLocalReplicateKey] = useState<string>('');
    const [localReplicateModel, setLocalReplicateModel] = useState<string>('');

    useEffect(() => {
        if (editingId) {
            const proj = state.projects.find(p => p.id === editingId);
            setLocalApiKey(proj?.falApiKey || '');
            setLocalReplicateKey(proj?.replicateApiKey || '');
            setLocalReplicateModel(proj?.replicateModel || '776402431718227633f81525a7a72d1a37c4f42065840d21e89f81f1856956f1');
        }
    }, [editingId, state.projects]);

    return (
        <div className="fixed inset-0 z-[500] bg-ink-950/98 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in">
        <div className="max-w-5xl w-full bg-ink-900 border-2 border-ink-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-ink-700 flex items-center justify-between">
        <div>
        <h2 className="font-display text-5xl tracking-widest text-steel-100 uppercase text-center">Archive</h2>
        <p className="font-mono text-xs text-ember-500 mt-2 tracking-[0.3em] uppercase text-center">Storyboard Management</p>
        </div>
        <button
        onClick={onClose}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-ink-800 hover:bg-red-500 text-steel-400 hover:text-white transition-all"
        >
        <Icons.X />
        </button>
        </div>

        <div className="p-10 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {state.projects.map(proj => (
            <div
            key={proj.id}
            onClick={() => { dispatch({ type: 'SET_ACTIVE_PROJECT', id: proj.id }); onClose(); }}
            className={`p-8 rounded-2xl border-2 cursor-pointer transition-all group relative overflow-hidden flex flex-col ${
                state.activeProjectId === proj.id
                ? 'border-ember-500 bg-ember-500/5 ring-4 ring-ember-500/10'
                : 'border-ink-700 hover:border-steel-500 bg-ink-950/50'
            }`}
            >
            <div className="relative z-10 flex-1">
            <div className="flex justify-between items-start">
            <h3 className="font-display text-3xl text-steel-100 group-hover:text-ember-500 transition-colors mb-2 uppercase truncate pr-4">
            {proj.title}
            </h3>
            <button
            onClick={(e) => { e.stopPropagation(); setEditingId(proj.id === editingId ? null : proj.id); }}
            className={`p-2 rounded-full border transition-all flex-shrink-0 ${
                editingId === proj.id ? 'bg-ember-500 text-ink-950 border-ember-500' : 'bg-ink-800 text-steel-500 border-ink-700 hover:border-ember-500/50'
            }`}
            >
            <Icons.Edit />
            </button>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-steel-500 uppercase tracking-widest">
            <span>{proj.issues.reduce((acc, i) => acc + i.pages.length, 0)} Pages</span>
            <div className="w-1 h-1 rounded-full bg-steel-700"></div>
            <span>{proj.characters.length} Cast</span>
            </div>
            </div>

            <div className="mt-6 flex justify-between items-center relative z-10">
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-ink-800 text-steel-600 border border-ink-700 uppercase">
            {proj.imageProvider}
            </span>
            <button
            onClick={(e) => {
                e.stopPropagation();
                if(confirm('Delete Project?')) dispatch({ type: 'DELETE_PROJECT', id: proj.id });
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-steel-700 hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
            <Icons.Trash />
            </button>
            </div>

            {editingId === proj.id && (
                <div onClick={e => e.stopPropagation()} className="mt-6 p-4 bg-ink-950 rounded-xl border border-ink-700 space-y-4 animate-fade-in shadow-2xl">
                <div>
                <label className="text-[9px] font-mono text-steel-500 uppercase block mb-1">Image Engine</label>
                <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                <button
                onClick={() => dispatch({ type: 'UPDATE_PROJECT', id: proj.id, updates: { imageProvider: 'gemini' } })}
                className={`flex-1 text-[10px] font-mono py-2 rounded border transition-all ${proj.imageProvider === 'gemini' ? 'bg-ember-500 text-ink-950 border-ember-500 font-bold' : 'bg-ink-900 text-steel-500 border-ink-700'}`}
                >
                GEMINI
                </button>
                <button
                onClick={() => dispatch({ type: 'UPDATE_PROJECT', id: proj.id, updates: { imageProvider: 'fal-flux' } })}
                className={`flex-1 text-[10px] font-mono py-2 rounded border transition-all ${proj.imageProvider === 'fal-flux' ? 'bg-ember-500 text-ink-950 border-ember-500 font-bold' : 'bg-ink-900 text-steel-500 border-ink-700'}`}
                >
                FAL.AI
                </button>
                </div>
                <button
                onClick={() => dispatch({ type: 'UPDATE_PROJECT', id: proj.id, updates: { imageProvider: 'replicate-flux' } })}
                className={`w-full text-[10px] font-mono py-2 rounded border transition-all ${proj.imageProvider === 'replicate-flux' ? 'bg-ember-500 text-ink-950 border-ember-500 font-bold' : 'bg-ink-900 text-steel-500 border-ink-700'}`}
                >
                REPLICATE
                </button>
                </div>
                </div>

                {proj.imageProvider === 'fal-flux' && (
                    <div className="mt-4 p-3 bg-ink-800 rounded border border-ink-700 space-y-3">
                    <div>
                    <label className="block text-[9px] font-mono text-steel-400 uppercase mb-1.5">fal.ai API Key</label>
                    <div className="flex gap-2">
                    <input
                    type="password"
                    placeholder="key-xxxx..."
                    value={localApiKey}
                    onChange={e => setLocalApiKey(e.target.value)}
                    className="flex-1 bg-ink-900 border border-ink-700 rounded px-2 py-1.5 text-xs text-steel-300 font-mono outline-none focus:border-ember-500"
                    />
                    <button
                    onClick={() => {
                        if (localApiKey.trim()) {
                            dispatch({ type: 'UPDATE_PROJECT_FAL_KEY', projectId: proj.id, apiKey: localApiKey.trim() });
                            alert('fal.ai Key saved!');
                        }
                    }}
                    disabled={!localApiKey.trim()}
                    className="bg-ember-500 hover:bg-ember-400 text-ink-950 font-bold px-3 py-1 rounded uppercase text-[9px] disabled:opacity-50"
                    >
                    Save
                    </button>
                    </div>
                    </div>
                    </div>
                )}

                {proj.imageProvider === 'replicate-flux' && (
                    <div className="mt-4 p-3 bg-ink-800 rounded border border-ink-700 space-y-3">
                    <div>
                    <label className="block text-[9px] font-mono text-steel-400 uppercase mb-1.5">Replicate API Key</label>
                    <div className="flex gap-2">
                    <input
                    type="password"
                    placeholder="r8_xxxx..."
                    value={localReplicateKey}
                    onChange={e => setLocalReplicateKey(e.target.value)}
                    className="flex-1 bg-ink-900 border border-ink-700 rounded px-2 py-1.5 text-xs text-steel-300 font-mono outline-none focus:border-ember-500"
                    />
                    <button
                    onClick={() => {
                        if (localReplicateKey.trim()) {
                            dispatch({ type: 'UPDATE_PROJECT_REPLICATE_KEY', projectId: proj.id, apiKey: localReplicateKey.trim() });
                            alert('Replicate Key saved!');
                        }
                    }}
                    disabled={!localReplicateKey.trim()}
                    className="bg-ember-500 hover:bg-ember-400 text-ink-950 font-bold px-3 py-1 rounded uppercase text-[9px] disabled:opacity-50"
                    >
                    Save
                    </button>
                    </div>
                    </div>
                    <div>
                    <label className="block text-[9px] font-mono text-steel-400 uppercase mb-1.5">Model Version</label>
                    <div className="flex flex-col gap-2">
                    <input
                    type="text"
                    placeholder="version hash..."
                    value={localReplicateModel}
                    onChange={e => setLocalReplicateModel(e.target.value)}
                    className="w-full bg-ink-900 border border-ink-700 rounded px-2 py-1.5 text-[10px] text-steel-300 font-mono outline-none focus:border-ember-500"
                    />
                    <div className="flex gap-1.5">
                    <button
                    onClick={() => {
                        dispatch({ type: 'UPDATE_PROJECT_REPLICATE_MODEL', projectId: proj.id, model: localReplicateModel.trim() });
                        alert('Model updated!');
                    }}
                    className="bg-ink-700 hover:bg-ember-500 text-steel-300 hover:text-ink-950 font-bold px-3 py-1.5 rounded uppercase text-[8px] flex-1 transition-colors"
                    >
                    Update Model
                    </button>
                    <button
                    onClick={() => setLocalReplicateModel('776402431718227633f81525a7a72d1a37c4f42065840d21e89f81f1856956f1')}
                    className="bg-ink-900 border border-ink-700 text-steel-500 px-2 py-1.5 rounded uppercase text-[8px] hover:text-steel-300"
                    >
                    Reset
                    </button>
                    </div>
                    </div>
                    </div>
                    </div>
                )}
                </div>
            )}
            </div>
        ))}

        <button
        onClick={() => {
            const name = prompt("Project Title:");
            if (name) dispatch({ type: 'ADD_PROJECT', title: name });
        }}
        className="p-8 rounded-2xl border-2 border-dashed border-ink-700 hover:border-ember-500 hover:bg-ember-500/5 flex flex-col items-center justify-center gap-6 text-steel-500 hover:text-ember-500 transition-all group min-h-[220px]"
        >
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-steel-800 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icons.Plus />
        </div>
        <span className="font-display text-2xl uppercase tracking-widest text-center">Initialize Sequence</span>
        </button>
        </div>
        </div>
        </div>
    );
};

export default ProjectHub;
