import React, { useState, useReducer, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  Modifier
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import {
  TransformWrapper,
  TransformComponent,
  useTransformContext
} from 'react-zoom-pan-pinch';
import JSZip from 'jszip';

import {
  Page,
  Issue,
  Character,
  AspectRatio
} from './types';
import { appReducer } from './state/reducer';
import { createInitialState } from './state/initialState';
import { genId } from './utils/helpers';
import { getImage, saveImage } from './services/imageStorage';
import { ART_STYLES, Icons, ASPECT_CONFIGS } from './constants';
import { ScriptImportModal } from './components/ScriptImportModal';
import { ParseResult } from './services/scriptParser';

import Sidebar from './components/Sidebar';
import PanelCard from './components/PanelCard';
import ZoomControls from './components/ZoomControls';
import ProjectHub from './components/ProjectHub';

import { generateImage } from './services/geminiService';
import { generateFluxImage as generateFalFlux } from './services/falFluxService';
import { generateFluxImage as generateReplicateFlux } from './services/replicateFluxService';

/**
 * Custom modifier for dnd-kit to handle the scale factor from react-zoom-pan-pinch.
 * Without this, the drag overlay moves at a different speed than the mouse when zoomed.
 */
const createScaleModifier = (scale: number): Modifier => ({ transform }) => {
  return {
    ...transform,
    x: transform.x / scale,
    y: transform.y / scale,
  };
};

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, createInitialState);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [batching, setBatching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showScriptImport, setShowScriptImport] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [showGutters, setShowGutters] = useState(false);

  const activeProject = state.projects.find(p => p.id === state.activeProjectId);
  const activeIssue = activeProject?.issues.find(i => i.id === state.activeIssueId);
  const activePage = activeIssue?.pages.find(p => p.id === state.activePageId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
                             useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // We don't force zoom off here anymore, we let the scale modifier handle it
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (active && over && active.id !== over.id && activePage) {
      const oldIndex = activePage.panels.findIndex(p => p.id === active.id);
      const newIndex = activePage.panels.findIndex(p => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newPanels = arrayMove(activePage.panels, oldIndex, newIndex);
        dispatch({ type: 'REORDER_PANELS', pageId: activePage.id, panels: newPanels });
      }
    }
  };

  const activePanelForOverlay = useMemo(() => {
    return activePage?.panels.find(p => p.id === activeId);
  }, [activeId, activePage]);

  const handleExportPage = async () => {
    if (!activePage) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      const zip = new JSZip();
      const pageFolder = zip.folder(`Page_${activePage.number}`);
      for (let i = 0; i < activePage.panels.length; i++) {
        const panel = activePage.panels[i];
        if (panel.imageUrl) {
          let dataUrl = panel.imageUrl;
          if (dataUrl.startsWith('idb://')) {
            const id = dataUrl.replace('idb://', '');
            dataUrl = await getImage(id) || '';
          }
          if (dataUrl) {
            const base64 = dataUrl.split(',')[1];
            pageFolder?.file(`panel_${i + 1}.png`, base64, { base64: true });
          }
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Page_${activePage.number}_Ink.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportIssue = async () => {
    if (!activeIssue) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      const zip = new JSZip();
      for (const page of activeIssue.pages) {
        for (let i = 0; i < page.panels.length; i++) {
          const panel = page.panels[i];
          if (panel.imageUrl) {
            let dataUrl = panel.imageUrl;
            if (dataUrl.startsWith('idb://')) {
              const id = dataUrl.replace('idb://', '');
              dataUrl = await getImage(id) || '';
            }
            if (dataUrl) {
              const base64 = dataUrl.split(',')[1];
              const fileName = `pg${String(page.number).padStart(3, '0')}_p${String(i + 1).padStart(2, '0')}.png`;
              zip.file(fileName, base64, { base64: true });
            }
          }
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeIssue.title.replace(/\s+/g, '_')}.cbz`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e);
    } finally {
      setExporting(false);
    }
  };

  const handleScriptImport = (result: ParseResult) => {
    if (!result.success || !activeProject) return;
    const newPages: Page[] = result.pages.map((parsedPage) => ({
      id: genId(),
                                                               number: parsedPage.pageNumber,
                                                               panels: parsedPage.panels.map(parsedPanel => ({
                                                                 id: genId(),
                                                                                                             prompt: parsedPanel.description,
                                                                                                             aspectRatio: parsedPanel.aspectRatio,
                                                                                                             characterIds: [],
                                                                                                             textElements: parsedPanel.bubbles.map((bubble, idx) => ({
                                                                                                               id: genId(),
                                                                                                                                                                     type: bubble.type === 'dialogue' ? 'dialogue' as const : bubble.type === 'thought' ? 'thought' as const : 'caption' as const,
                                                                                                                                                                     content: bubble.character ? `${bubble.character}: ${bubble.text}` : bubble.text,
                                                                                                                                                                     x: 10, y: 10 + (idx * 15), width: 30, height: 10, fontSize: 18, color: '#000000', rotation: 0, tailX: 15, tailY: 10 + (idx * 15) + 15,
                                                                                                                                                                     tailStyle: bubble.type === 'thought' ? 'cloud' : (bubble.type === 'caption' ? 'none' : 'pointy')
                                                                                                             })),
                                                               })),
    }));
    const newCharacters: Character[] = result.characters.map(c => ({
      id: genId(),
                                                                   name: c.name,
                                                                   description: c.firstAppearance || `${c.lineCount} lines`,
    }));
    const newIssue: Issue = { id: genId(), title: `Imported: ${result.pages.length} Pages`, pages: newPages };
    dispatch({ type: 'IMPORT_ISSUE', projectId: activeProject.id, issue: newIssue, characters: newCharacters });
    setShowScriptImport(false);
  };

  const generatePage = async () => {
    if (!activePage || batching || !activeProject) return;
    setBatching(true);
    try {
      for (const panel of activePage.panels) {
        if (!panel.prompt && panel.characterIds.length === 0) continue;
        if (panel.imageUrl) continue;
        const styleConfig = ART_STYLES.find(s => s.id === activeProject?.style);
        const stylePrompt = styleConfig?.prompt || '';
        const activeChars = activeProject?.characters.filter(c => panel.characterIds.includes(c.id)) || [];
        const charSection = activeChars.length > 0 ? `Characters: ${activeChars.map(c => c.name).join(', ')}.` : '';
        const config = ASPECT_CONFIGS[panel.aspectRatio];
        let initImage: string | undefined;
        if (panel.referencePanelId) {
          const refPanel = activePage.panels.find(p => p.id === panel.referencePanelId);
          if (refPanel?.imageUrl) {
            const id = refPanel.imageUrl.startsWith('idb://') ? refPanel.imageUrl.slice(6) : null;
            if (id) initImage = await getImage(id) || undefined;
          }
        }
        const consistencySuffix = " Maintain strong visual and character consistency with the reference image. Same lighting, angle, style.";
        const fullPrompt = `${stylePrompt}. ${charSection} ${panel.prompt}.${initImage ? consistencySuffix : ''}`.trim();
        let url: string | undefined;
        try {
          if (activeProject.imageProvider === 'gemini') {
            url = await generateImage(fullPrompt, config.ratio, initImage, panel.referenceStrength ?? 0.7);
          } else if (activeProject.imageProvider === 'fal-flux' && activeProject.falApiKey) {
            url = await generateFalFlux(fullPrompt, panel.aspectRatio, activeProject.falApiKey, activeProject.fluxModel || 'fal-ai/flux-pro', initImage, panel.referenceStrength ?? 0.7);
          } else if (activeProject.imageProvider === 'replicate-flux' && activeProject.replicateApiKey) {
            url = await generateReplicateFlux(fullPrompt, panel.aspectRatio, activeProject.replicateApiKey, activeProject.replicateModel || '776402431718227633f81525a7a72d1a37c4f42065840d21e89f81f1856956f1', initImage, panel.referenceStrength ?? 0.7);
          }
        } catch (err) { console.error(err); }
        if (url) {
          const storedRef = await saveImage(panel.id, url);
          dispatch({ type: 'UPDATE_PANEL', panelId: panel.id, updates: { imageUrl: storedRef } });
        }
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (e: any) {
      alert(`Batch Failed: ${e.message}`);
    } finally { setBatching(false); }
  };

  return (
    <div className={`h-screen w-full flex overflow-hidden font-sans selection:bg-ember-500/30 ${showGutters ? 'bg-gray-200' : 'bg-ink-950'}`}>
    <Sidebar
    state={state}
    dispatch={dispatch}
    onOpenProjects={() => setProjectsOpen(true)}
    onOpenScriptImport={() => setShowScriptImport(true)}
    />

    <TransformWrapper
    disabled={!zoomEnabled}
    initialScale={1}
    minScale={0.1}
    maxScale={3}
    centerOnInit={true}
    limitToBounds={false}
    panning={{ disabled: !zoomEnabled, velocityDisabled: true }}
    wheel={{ disabled: !zoomEnabled }}
    >
    <main className={`flex-1 flex flex-col overflow-hidden relative transition-colors ${showGutters ? 'bg-gray-200' : 'bg-ink-950'} ${zoomEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}>
    <header className={`px-10 py-6 border-b flex items-center justify-between z-[100] backdrop-blur-xl transition-all ${showGutters ? 'bg-white/80 border-black' : 'bg-ink-950/50 border-ink-700/50'}`}>
    <div className="flex flex-col gap-1 overflow-hidden">
    <div className={`flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest truncate ${showGutters ? 'text-gray-500' : 'text-steel-500'}`}>
    <span>{activeProject?.title}</span>
    <span className="opacity-30">/</span>
    <span className={showGutters ? 'text-black' : 'text-ember-500/80'}>{activeIssue?.title}</span>
    </div>
    <h1 className={`font-display text-4xl uppercase tracking-tighter truncate ${showGutters ? 'text-black' : 'text-steel-100'}`}>
    Page {activePage?.number || '-'}
    </h1>
    </div>

    <div className="flex items-center gap-6">
    <ZoomControls
    zoomEnabled={zoomEnabled}
    setZoomEnabled={setZoomEnabled}
    showGutters={showGutters}
    setShowGutters={setShowGutters}
    />

    <div className="flex gap-4 relative pointer-events-auto">
    <div className="relative">
    <button
    onClick={() => setShowExportMenu(!showExportMenu)}
    className={`font-mono text-xs px-6 py-2.5 tracking-widest transition-all rounded-full border flex items-center gap-3 active:scale-95 shadow-lg ${showGutters ? 'bg-white border-black text-black hover:bg-gray-100' : 'bg-ink-800 border-ink-700 text-steel-200 hover:bg-ink-700'}`}
    >
    {exporting ? <Icons.Loader /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
    EXPORT
    </button>
    {showExportMenu && (
      <div className="absolute top-full right-0 mt-2 w-56 bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in py-1">
      <button onClick={handleExportPage} className="w-full text-left px-4 py-3 text-xs font-mono text-steel-300 hover:bg-ember-500 hover:text-ink-950 transition-colors uppercase tracking-widest flex items-center gap-3"><span>ZIP Page Images</span></button>
      <button onClick={handleExportIssue} className="w-full text-left px-4 py-3 text-xs font-mono text-steel-300 hover:bg-ember-500 hover:text-ink-950 transition-colors uppercase tracking-widest flex items-center gap-3"><span>CBZ Complete Issue</span></button>
      </div>
    )}
    </div>
    <button disabled={batching || !activePage?.panels.length} onClick={generatePage} className={`font-mono text-xs px-8 py-2.5 tracking-widest transition-all rounded-full border flex items-center gap-3 disabled:opacity-20 active:scale-95 shadow-lg ${showGutters ? 'bg-white border-black text-black hover:bg-gray-100' : 'bg-ink-800 border-ink-700 text-steel-200 hover:bg-ink-700'}`}>
    {batching ? <Icons.Loader /> : <Icons.Magic />}AUTO-INK
    </button>
    <button onClick={() => activePage && dispatch({ type: 'ADD_PANEL', pageId: activePage.id })} className={`font-display text-2xl px-10 py-2.5 tracking-widest transition-all rounded-full shadow-lg active:translate-y-1 ${showGutters ? 'bg-black text-white hover:bg-gray-800' : 'bg-ember-500 hover:bg-ember-400 text-ink-950'}`}>
    ADD FRAME
    </button>
    </div>
    </div>
    </header>

    <TransformComponent wrapperClass="flex-1 overflow-hidden" contentClass="min-h-full min-w-full">
    <ZoomableCanvas
    activePage={activePage}
    activeProject={activeProject}
    dispatch={dispatch}
    sensors={sensors}
    handleDragStart={handleDragStart}
    handleDragEnd={handleDragEnd}
    activeId={activeId}
    activePanelForOverlay={activePanelForOverlay}
    showGutters={showGutters}
    zoomEnabled={zoomEnabled}
    />
    </TransformComponent>

    <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 border border-white/10 rounded-full px-8 py-4 flex items-center gap-10 shadow-2xl z-[400] transition-all ${showGutters ? 'bg-white border-black text-black' : 'bg-ink-900/95 backdrop-blur-2xl text-steel-400'}`}>
    <div className="flex items-center gap-4">
    <div className={`w-3 h-3 rounded-full ${batching || exporting ? 'bg-ember-500 animate-ping' : 'bg-green-500'}`}></div>
    <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold">{batching ? 'BATCH INKING...' : exporting ? 'EXPORTING...' : 'TERMINAL READY'}</span>
    </div>
    <div className={`h-5 w-px ${showGutters ? 'bg-black/20' : 'bg-ink-700'}`}></div>
    <div className="flex gap-8">
    <div className="flex flex-col">
    <span className="text-[9px] font-mono uppercase mb-0.5 opacity-60">Project</span>
    <span className={`text-[11px] font-mono uppercase font-bold truncate max-w-[120px] ${showGutters ? 'text-black' : 'text-steel-200'}`}>{activeProject?.title}</span>
    </div>
    </div>
    </div>
    </main>
    </TransformWrapper>

    {projectsOpen && <ProjectHub state={state} dispatch={dispatch} onClose={() => setProjectsOpen(false)} />}
    {showScriptImport && <ScriptImportModal onClose={() => setShowScriptImport(false)} onImport={handleScriptImport} />}
    </div>
  );
}

/**
 * Sub-component to hold DndContext and grid inside the TransformWrapper.
 * This allows us to use context hooks to adjust drag behavior based on zoom level.
 */
function ZoomableCanvas({
  activePage, activeProject, dispatch, sensors, handleDragStart, handleDragEnd,
  activeId, activePanelForOverlay, showGutters, zoomEnabled
}: any) {
  const { state: transformState } = useTransformContext() as any;
  const scale = transformState?.scale || 1;

  // Create scale modifier inside the component so it updates with scale changes
  const modifiers = useMemo(() => [createScaleModifier(scale)], [scale]);

  return (
    <div className={`min-h-full w-full p-10 pb-32 transition-all ${showGutters ? 'max-w-[1400px] mx-auto' : ''} ${zoomEnabled ? 'pointer-events-none [&>*]:pointer-events-auto' : ''}`}>
    {!activePage || activePage.panels.length === 0 ? (
      <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-ink-800 gap-8 animate-fade-in">
      <div className={`w-56 h-56 border-4 border-dashed rounded-[3rem] flex items-center justify-center opacity-40 group hover:opacity-100 transition-opacity ${showGutters ? 'border-gray-400' : 'border-ink-900'}`}>
      <div className={`scale-[3] transition-colors ${showGutters ? 'text-gray-400 group-hover:text-black' : 'text-ink-800 group-hover:text-ember-500'}`}>
      <Icons.Plus />
      </div>
      </div>
      <p className={`font-display text-5xl tracking-widest uppercase mb-2 text-center ${showGutters ? 'text-gray-400' : 'text-ink-800'}`}>Canvas Sterile</p>
      </div>
    ) : (
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={modifiers}>
      <SortableContext items={activePage.panels.map((p: any) => p.id)} strategy={rectSortingStrategy}>
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 transition-all ${showGutters ? 'gap-20' : 'gap-8 md:gap-12'}`} style={{ gridAutoRows: 'min-content' }}>
      {activePage.panels.map((panel: any, idx: number) => (
        <div key={panel.id} className="min-h-0">
        <PanelCard
        panel={panel}
        pageId={activePage.id}
        dispatch={dispatch}
        project={activeProject!}
        characters={activeProject?.characters || []}
        index={idx}
        total={activePage.panels.length}
        showGutters={showGutters}
        activePage={activePage}
        />
        </div>
      ))}
      </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.3' } } }) }}>
      {activeId && activePanelForOverlay ? (
        <div className="w-[300px] md:w-[400px]">
        <PanelCard
        panel={activePanelForOverlay}
        pageId={activePage.id}
        dispatch={dispatch}
        project={activeProject!}
        characters={activeProject?.characters || []}
        index={activePage.panels.findIndex((p: any) => p.id === activeId)}
        total={activePage.panels.length}
        showGutters={showGutters}
        activePage={activePage}
        isOverlay
        />
        </div>
      ) : null}
      </DragOverlay>
      </DndContext>
    )}
    </div>
  );
}
