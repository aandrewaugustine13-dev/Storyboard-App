
import React, { useState } from 'react';
import { parseScript, ParseResult, VisualMarker } from '../services/scriptParser';

interface Props {
    onClose: () => void;
    onImport: (result: ParseResult) => void;
}

const MARKER_COLORS: Record<VisualMarker, string> = {
    standard: 'text-steel-400',
    echo: 'text-red-500',
    hitch: 'text-cyan-500',
    overflow: 'text-purple-500',
    shattered: 'text-red-400',
    split: 'text-amber-500',
    splash: 'text-emerald-500',
};

export function ScriptImportModal({ onClose, onImport }: Props) {
    const [script, setScript] = useState('');
    const [result, setResult] = useState<ParseResult | null>(null);

    const handleParse = () => {
        const parsed = parseScript(script);
        setResult(parsed);
    };

    const handleImport = () => {
        if (result?.success) {
            onImport(result);
            onClose();
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setScript(ev.target?.result as string || '');
                setResult(null);
            };
            reader.readAsText(file);
        }
    };

    const totalPanels = result?.pages.reduce((sum, p) => sum + p.panels.length, 0) || 0;
    const markerCounts = result?.pages.reduce((acc, p) => {
        p.panels.forEach(pan => {
            if (pan.visualMarker !== 'standard') {
                acc[pan.visualMarker] = (acc[pan.visualMarker] || 0) + 1;
            }
        });
        return acc;
    }, {} as Record<string, number>) || {};

    return (
        <div className="fixed inset-0 bg-ink-950/95 backdrop-blur-xl flex items-center justify-center z-[600] p-8">
        <div className="w-full max-w-5xl bg-ink-900 border-2 border-ink-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-6 border-b border-ink-700 flex items-center justify-between">
        <div>
        <h2 className="font-display text-3xl tracking-widest text-ember-500 uppercase">Script Import</h2>
        <p className="text-[10px] font-mono text-steel-500 mt-1 uppercase tracking-widest">Paste script or upload .txt file</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-ink-800 hover:bg-red-500 text-steel-400 hover:text-white transition-all text-xl font-bold">×</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6 border-r border-ink-700">
        <div className="mb-4">
        <input
        type="file"
        accept=".txt,.md"
        onChange={handleFile}
        className="text-[10px] text-steel-400 file:mr-3 file:py-2 file:px-4 file:border file:border-ink-700 file:bg-ink-800 file:text-ember-500 file:font-bold file:text-[9px] file:uppercase file:cursor-pointer file:rounded-lg hover:file:bg-ink-700"
        />
        </div>
        <textarea
        value={script}
        onChange={(e) => { setScript(e.target.value); setResult(null); }}
        placeholder={`PAGE ONE

            Panel 1
            Wide shot. City street at night.
            CAPTION: Two hours earlier.

            Panel 2
            Close on DETECTIVE JACK, lighting a cigarette.
            JACK: This city never sleeps.
            JACK (thought): Neither do I anymore.

            Panel 3 [ECHO]
            Flash - Jack sees a body in the alley. Shattered panel edges.
            Artist note: Red tint, fractured borders.
            SFX: BANG`}
            className="flex-1 w-full bg-ink-950 border border-ink-700 rounded-xl p-4 font-mono text-xs text-steel-300 outline-none resize-none focus:border-ember-500 transition-colors"
            />
            </div>

            <div className="w-96 flex flex-col p-6 bg-ink-950/50">
            <button
            onClick={handleParse}
            disabled={!script.trim()}
            className="w-full py-3 mb-6 bg-ember-500 hover:bg-ember-400 text-ink-950 font-bold text-xs uppercase tracking-widest rounded-lg disabled:opacity-30 transition-all"
            >
            Parse Script
            </button>

            {result && (
                <div className="flex-1 overflow-y-auto space-y-4">
                <div className={`p-4 border rounded-lg ${result.success ? 'bg-green-950/30 border-green-700/50' : 'bg-red-950/30 border-red-700/50'}`}>
                <p className={`font-bold text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? '✓ Parse Successful' : '✗ Parse Failed'}
                </p>
                {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-300 mt-1">{err}</p>
                ))}
                </div>

                {result.success && (
                    <>
                    <div className="grid grid-cols-3 gap-3">
                    <div className="bg-ink-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-display text-ember-500">{result.pages.length}</p>
                    <p className="text-[9px] font-mono text-steel-500 uppercase">Pages</p>
                    </div>
                    <div className="bg-ink-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-display text-ember-500">{totalPanels}</p>
                    <p className="text-[9px] font-mono text-steel-500 uppercase">Panels</p>
                    </div>
                    <div className="bg-ink-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-display text-ember-500">{result.characters.length}</p>
                    <p className="text-[9px] font-mono text-steel-500 uppercase">Characters</p>
                    </div>
                    </div>

                    {Object.keys(markerCounts).length > 0 && (
                        <div className="bg-ink-800 rounded-lg p-4">
                        <p className="text-[10px] font-mono text-steel-500 uppercase mb-2">Visual Markers Detected</p>
                        <div className="flex flex-wrap gap-2">
                        {Object.entries(markerCounts).map(([marker, count]) => (
                            <span key={marker} className={`text-[10px] font-mono px-2 py-1 rounded-full bg-ink-900 ${MARKER_COLORS[marker as VisualMarker]}`}>
                            {marker}: {count}
                            </span>
                        ))}
                        </div>
                        </div>
                    )}

                    <div className="bg-ink-800 rounded-lg p-4">
                    <p className="text-[10px] font-mono text-steel-500 uppercase mb-2">Cast Detected</p>
                    <div className="flex flex-wrap gap-2">
                    {result.characters.map(char => (
                        <span key={char.name} className="text-[10px] font-mono px-2 py-1 rounded-full bg-ink-900 text-steel-300">
                        {char.name} <span className="text-steel-600">({char.lineCount})</span>
                        </span>
                    ))}
                    </div>
                    </div>

                    {result.warnings.length > 0 && (
                        <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4">
                        <p className="text-[10px] font-mono text-amber-500 uppercase mb-2">Warnings</p>
                        {result.warnings.map((warn, i) => (
                            <p key={i} className="text-xs text-amber-300">{warn}</p>
                        ))}
                        </div>
                    )}

                    <button
                    onClick={handleImport}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-sm uppercase tracking-widest rounded-lg transition-all mt-4"
                    >
                    Import {result.pages.length} Pages → Storyboard
                    </button>
                    </>
                )}
                </div>
            )}
            </div>
            </div>
            </div>
            </div>
    );
}
