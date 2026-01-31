import React from 'react';
import { useTransformContext } from 'react-zoom-pan-pinch';

interface ZoomControlsProps {
    zoomEnabled: boolean;
    setZoomEnabled: (v: boolean) => void;
    showGutters: boolean;
    setShowGutters: (v: boolean) => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
    zoomEnabled,
    setZoomEnabled,
    showGutters,
    setShowGutters
}) => {
    // Fix: Cast useTransformContext() to any to bypass incorrect library types that may omit methods and state
    const { zoomIn, zoomOut, resetTransform, state } = useTransformContext() as any;
    const scale = state?.scale || 1;

    return (
        <div className="flex items-center gap-2 bg-ink-900 border border-ink-700 rounded-full px-4 py-1.5 shadow-xl transition-all hover:border-ink-600">
        <button
        onClick={() => {
            if (zoomEnabled) resetTransform();
            setZoomEnabled(!zoomEnabled);
        }}
        className={`p-1.5 rounded-full transition-all flex items-center gap-2 px-3 ${zoomEnabled ? 'text-ember-500 bg-ember-500/10 scale-105' : 'text-steel-600 hover:text-steel-300'}`}
        title={zoomEnabled ? "Exit Canvas Navigation" : "Enter Canvas Navigation (Pan/Zoom)"}
        >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        {zoomEnabled && <span className="text-[9px] font-mono font-bold tracking-widest uppercase">NAV MODE</span>}
        </button>

        <div className="w-px h-4 bg-ink-700 mx-1"></div>

        <button
        onClick={() => setShowGutters(!showGutters)}
        className={`p-1.5 rounded-full transition-colors ${showGutters ? 'text-ember-500 bg-ember-500/10' : 'text-steel-600 hover:text-steel-300'}`}
        title="Toggle Comic Gutter Layout"
        >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM8 4v16M16 4v16M4 8h16M4 16h16" />
        </svg>
        </button>

        <div className="w-px h-4 bg-ink-700 mx-1"></div>

        <div className="flex items-center gap-1">
        <button onClick={() => zoomOut()} className="text-steel-500 hover:text-ember-500 transition-colors p-1" title="Zoom Out">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
        </button>

        <button
        onClick={() => resetTransform()}
        className="text-[10px] font-mono font-bold text-steel-300 w-12 text-center hover:text-ember-500 transition-colors"
        title="Reset View (100%)"
        >
        {Math.round(scale * 100)}%
        </button>

        <button onClick={() => zoomIn()} className="text-steel-500 hover:text-ember-500 transition-colors p-1" title="Zoom In">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        </button>
        </div>
        </div>
    );
};

export default ZoomControls;
