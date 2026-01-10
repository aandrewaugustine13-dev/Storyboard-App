
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateGalleryFrame } from './services/geminiService';
import { Character, StoryboardPanel, Issue, Page, Project, AspectRatio } from './types';
import { Button } from './components/Button';
import html2canvas from 'html2canvas';

// --- INITIAL STATE ---
const INITIAL_PROJECT: Project = {
  issues: [{
    id: 'issue-1',
    title: 'Issue #1: The Crossing',
    pages: [{ id: 'page-1', number: 1, panels: [] }]
  }],
  characters: [],
  activeIssueId: 'issue-1',
  activePageId: 'page-1'
};

const ASPECT_CLASSES: Record<AspectRatio, string> = {
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
  "4:3": "aspect-[4/3]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video"
};

const STORAGE_KEY = 'owb_project_v6';

// --- SUB-COMPONENTS ---

const CharacterCodexItem = React.memo(({ 
  char, 
  isSelected, 
  onToggle 
}: { 
  char: Character; 
  isSelected: boolean; 
  onToggle: (id: string) => void; 
}) => (
  <div 
    onClick={() => onToggle(char.id)}
    className={`p-3 border transition-all cursor-pointer select-none mb-2 flex items-start gap-3 ${
      isSelected 
      ? 'bg-red-950/20 border-red-900 text-red-100' 
      : 'bg-black border-zinc-900 text-zinc-500 hover:border-zinc-700'
    }`}
  >
    {char.referenceImage ? (
      <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex-shrink-0 overflow-hidden grayscale hover:grayscale-0 transition-all">
        <img src={char.referenceImage} alt="" className="w-full h-full object-cover" />
      </div>
    ) : (
      <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex-shrink-0 flex items-center justify-center text-[10px] italic opacity-20">
        NO IMG
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-1">
        <p className="font-bold text-[10px] uppercase tracking-wider truncate">{char.name}</p>
        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />}
      </div>
      <div className="space-y-0.5">
        {char.archetype && <p className="text-[7px] uppercase font-bold text-zinc-600 truncate">{char.archetype}</p>}
        {char.visualKey && (
          <p className="text-[9px] text-red-900/60 font-mono italic truncate">Key: {char.visualKey}</p>
        )}
      </div>
    </div>
  </div>
));

const MovableFrame = React.memo(({ 
  panel, 
  characters,
  onDelete,
  onUpdateRatio,
  onMoveStart,
  onResizeStart,
  onBringToFront
}: { 
  panel: StoryboardPanel; 
  characters: Character[];
  onDelete: (id: string) => void;
  onUpdateRatio: (id: string, ratio: AspectRatio) => void;
  onMoveStart: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  onBringToFront: (id: string) => void;
}) => {
  const ratios: AspectRatio[] = ["1:1", "4:3", "16:9", "9:16", "3:4"];

  return (
    <div 
      id={`panel-${panel.id}`}
      style={{ 
        left: `${panel.x}px`, 
        top: `${panel.y}px`, 
        width: `${panel.width}px`,
        zIndex: panel.zIndex,
        position: 'absolute'
      }}
      onMouseDown={() => onBringToFront(panel.id)}
      className="group flex flex-col bg-zinc-950 border border-zinc-800 shadow-2xl transition-shadow hover:shadow-red-900/10 select-none animate-in fade-in zoom-in-95"
    >
      <div 
        onMouseDown={(e) => onMoveStart(e, panel.id)}
        className="h-6 bg-zinc-900 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing border-b border-zinc-800"
      >
        <span className="text-[8px] text-zinc-600 font-mono uppercase">ID: {panel.id.slice(0,6)}</span>
        <div className="flex gap-1 export-hide">
          {ratios.map(r => (
            <button 
              key={r}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onUpdateRatio(panel.id, r)}
              className={`text-[7px] px-1 border transition-colors ${panel.aspectRatio === r ? 'text-red-500 border-red-900 bg-red-950/20' : 'text-zinc-600 border-zinc-800 hover:text-zinc-400'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className={`relative overflow-hidden bg-black pointer-events-none transition-all duration-300 ${ASPECT_CLASSES[panel.aspectRatio]}`}>
        {panel.imageUrl && (
          <img src={panel.imageUrl} alt="" className="w-full h-full object-cover grayscale-[0.1]" crossOrigin="anonymous" />
        )}
      </div>

      <div className="p-3 space-y-2 relative bg-zinc-950">
        <div className="flex flex-wrap gap-1">
          {panel.charactersInvolved.map(cid => {
            const c = characters.find(char => char.id === cid);
            return c ? <span key={cid} className="text-[7px] font-bold text-red-900 uppercase border border-red-900/30 px-1">{c.name}</span> : null;
          })}
        </div>
        <p className="text-[9px] text-zinc-400 italic line-clamp-2 leading-tight">"{panel.prompt}"</p>
        
        <div className="pt-2 border-t border-zinc-900 flex justify-between export-hide">
          <button onClick={(e) => { e.stopPropagation(); onDelete(panel.id); }} className="text-[8px] text-zinc-700 hover:text-red-900 uppercase font-bold">Purge</button>
        </div>

        <div 
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, panel.id); }}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 export-hide"
        >
          <div className="w-1.5 h-1.5 border-r border-b border-zinc-800" />
        </div>
      </div>
    </div>
  );
});

const INITIAL_NEW_CHAR = { 
  name: '', 
  description: '', 
  traits: '', 
  visualKey: '', 
  referenceImage: '',
  archetype: '',
  motivation: '',
  backstory: ''
};

export default function App() {
  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [activeLayout, setActiveLayout] = useState<{name: string, ratio: AspectRatio}>({name: 'WIDE', ratio: '16:9'});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingChar, setIsAddingChar] = useState(false);
  const [newChar, setNewChar] = useState(INITIAL_NEW_CHAR);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string, startX: number, startY: number, itemX: number, itemY: number } | null>(null);
  const resizeRef = useRef<{ id: string, startX: number, startWidth: number } | null>(null);
  const maxZRef = useRef(100);

  const layouts: Array<{name: string, ratio: AspectRatio}> = [
    { name: 'WIDE', ratio: '16:9' },
    { name: 'STD', ratio: '4:3' },
    { name: 'CLOSE', ratio: '1:1' }
  ];

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed.issues && parsed.issues.length > 0) {
          setProject(parsed); 
        }
      } catch(e) { 
        console.error("Storage load error:", e);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch(e) {
      console.error("Storage save error (Quota likely exceeded):", e);
    }
  }, [project]);

  // --- HELPERS ---
  const activeIssue = useMemo(() => 
    project.issues.find(i => i.id === project.activeIssueId) || project.issues[0]
  , [project.issues, project.activeIssueId]);

  const activePage = useMemo(() => 
    activeIssue?.pages.find(p => p.id === project.activePageId) || activeIssue?.pages[0]
  , [activeIssue, project.activePageId]);

  const updateActivePagePanels = useCallback((updater: (panels: StoryboardPanel[]) => StoryboardPanel[]) => {
    setProject(prev => ({
      ...prev,
      issues: prev.issues.map(issue => 
        issue.id === prev.activeIssueId 
        ? {
            ...issue,
            pages: issue.pages.map(page => 
              page.id === prev.activePageId 
              ? { ...page, panels: updater(page.panels) }
              : page
            )
          }
        : issue
      )
    }));
  }, [project.activeIssueId, project.activePageId]);

  // --- EXPORT LOGIC ---
  const handleExportImage = async () => {
    if (!canvasRef.current || !activePage || activePage.panels.length === 0) return;
    
    setIsExporting(true);
    setErrorMsg(null);
    try {
      const panels = activePage.panels;
      const minX = Math.max(0, Math.min(...panels.map(p => p.x)) - 50);
      const minY = Math.max(0, Math.min(...panels.map(p => p.y)) - 180);
      const maxX = Math.max(...panels.map(p => p.x + p.width)) + 50;
      const maxY = Math.max(...panels.map(p => p.y + (p.width * (9/16)) + 200)) + 50;

      const captureWidth = maxX - minX;
      const captureHeight = maxY - minY;

      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        backgroundColor: '#020202',
        x: minX,
        y: minY,
        width: captureWidth,
        height: captureHeight,
        scale: 1.5,
        ignoreElements: (element) => element.classList.contains('export-hide'),
        logging: false
      });

      const link = document.createElement('a');
      const safeTitle = activeIssue?.title.replace(/[^a-z0-9]/gi, '_') || 'Issue';
      link.download = `OWB_${safeTitle}_Page${activePage.number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      setErrorMsg("Memory limit reached or render failed. Try fewer panels per page.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- INTERACTIONS ---
  const handleInteractionEnd = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleInteractionEnd);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const newX = dragRef.current.itemX + deltaX;
    const newY = dragRef.current.itemY + deltaY;
    updateActivePagePanels(panels => panels.map(p => p.id === dragRef.current?.id ? { ...p, x: newX, y: newY } : p));
  }, [updateActivePagePanels]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return;
    const deltaX = e.clientX - resizeRef.current.startX;
    const newWidth = Math.max(200, Math.min(1200, resizeRef.current.startWidth + deltaX));
    updateActivePagePanels(panels => panels.map(p => p.id === resizeRef.current?.id ? { ...p, width: newWidth } : p));
  }, [updateActivePagePanels]);

  const handleGenerate = async () => {
    if (!currentPrompt.trim() || isGenerating || !activePage) return;
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const activeChars = project.characters.filter(c => selectedCharIds.includes(c.id));
      const imageUrl = await generateGalleryFrame(currentPrompt, activeChars, activePage.panels, activeLayout.ratio);
      
      const newPanel: StoryboardPanel = {
        id: Math.random().toString(36).substr(2, 9),
        prompt: currentPrompt,
        imageUrl,
        timestamp: Date.now(),
        charactersInvolved: [...selectedCharIds],
        x: 100 + (activePage.panels.length * 40),
        y: 100 + (activePage.panels.length * 40),
        width: activeLayout.ratio === '16:9' ? 500 : 400,
        aspectRatio: activeLayout.ratio,
        zIndex: ++maxZRef.current
      };

      updateActivePagePanels(prev => [newPanel, ...prev]);
    } catch (err: any) {
      setErrorMsg(err.message || "Manifest failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSystemReset = () => {
    if (confirm("PURGE ALL DATA? This cannot be undone. Use this if the app is sluggish or crashing.")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewChar(prev => ({ ...prev, referenceImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addPage = () => {
    if (!activeIssue) return;
    const newPageId = `page-${Date.now()}`;
    setProject(prev => ({
      ...prev,
      issues: prev.issues.map(i => i.id === prev.activeIssueId 
        ? { ...i, pages: [...i.pages, { id: newPageId, number: i.pages.length + 1, panels: [] }] }
        : i),
      activePageId: newPageId
    }));
  };

  const addIssue = () => {
    const newIssueId = `issue-${Date.now()}`;
    const newPageId = `page-${Date.now()}`;
    setProject(prev => ({
      ...prev,
      issues: [...prev.issues, { 
        id: newIssueId, 
        title: `Issue #${prev.issues.length + 1}: Untitled`, 
        pages: [{ id: newPageId, number: 1, panels: [] }] 
      }],
      activeIssueId: newIssueId,
      activePageId: newPageId
    }));
  };

  const pageMarkerPos = useMemo(() => {
    if (!activePage || activePage.panels.length === 0) return { x: 100, y: 50 };
    const minX = Math.min(...activePage.panels.map(p => p.x));
    const minY = Math.min(...activePage.panels.map(p => p.y));
    return { x: minX, y: minY - 120 };
  }, [activePage]);

  return (
    <div className="fixed inset-0 flex bg-[#020202] text-zinc-300 overflow-hidden">
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col z-50 shadow-2xl">
        <div className="p-5 border-b border-zinc-900">
          <h1 className="font-serif text-lg text-red-700 leading-none uppercase">THE ONES<br/>WE BURNED</h1>
          <p className="text-[8px] uppercase tracking-widest mt-1 text-zinc-600">Art Director Dossier</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Issues</h3>
              <button onClick={addIssue} className="text-red-900 text-[10px] font-bold hover:text-red-500">+</button>
            </div>
            {project.issues.map(issue => (
              <div key={issue.id} className="mb-4">
                <div className={`text-[10px] font-bold mb-1 p-1 truncate ${project.activeIssueId === issue.id ? 'text-zinc-200' : 'text-zinc-600'}`}>
                  {issue.title}
                </div>
                <div className="pl-2 border-l border-zinc-900 space-y-1">
                  {issue.pages.map(page => (
                    <div key={page.id} className="group flex flex-col">
                      <button 
                        onClick={() => setProject(p => ({ ...p, activeIssueId: issue.id, activePageId: page.id }))}
                        className={`block w-full text-left text-[10px] px-2 py-1 transition-colors ${project.activePageId === page.id ? 'bg-red-950/20 text-red-500 border-l border-red-900' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Page {page.number}
                      </button>
                      
                      {project.activePageId === page.id && (
                        <div className="mt-2 pl-4 py-2 border-l border-zinc-800 space-y-2 animate-in fade-in slide-in-from-left-1">
                           <h4 className="text-[7px] uppercase font-bold text-zinc-600 tracking-widest">Page Actions</h4>
                           <button 
                            onClick={handleExportImage}
                            disabled={isExporting}
                            className="text-[9px] text-red-700 hover:text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 transition-colors disabled:opacity-30"
                           >
                            {isExporting ? 'Capturing...' : 'Export PNG'}
                           </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={addPage} className="text-[9px] text-zinc-700 px-2 py-1 hover:text-zinc-400 italic">+ New Page</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Codex</h3>
              <button onClick={() => setIsAddingChar(true)} className="text-red-900 text-[10px] font-bold hover:text-red-500">ADD</button>
            </div>
            {isAddingChar && (
              <div className="bg-zinc-900 p-3 border border-red-950 mb-4 space-y-2 animate-in fade-in zoom-in-95">
                <div className="space-y-1.5">
                  <input placeholder="Full Name" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900 transition-colors" value={newChar.name} onChange={e => setNewChar(p => ({...p, name: e.target.value}))} />
                  <input placeholder="Archetype" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900 transition-colors" value={newChar.archetype} onChange={e => setNewChar(p => ({...p, archetype: e.target.value}))} />
                  <input placeholder="Motivation" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900 transition-colors" value={newChar.motivation} onChange={e => setNewChar(p => ({...p, motivation: e.target.value}))} />
                  <textarea placeholder="Backstory" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900 transition-colors h-16 resize-none" value={newChar.backstory} onChange={e => setNewChar(p => ({...p, backstory: e.target.value}))} />
                  <input placeholder="Visual Traits" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900 transition-colors" value={newChar.traits} onChange={e => setNewChar(p => ({...p, traits: e.target.value}))} />
                  <input placeholder="Visual Key" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900 transition-colors" value={newChar.visualKey} onChange={e => setNewChar(p => ({...p, visualKey: e.target.value}))} />
                  <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-zinc-800 text-[9px] py-1 uppercase font-bold hover:bg-zinc-700">Ref Image</button>
                    {newChar.referenceImage && <div className="w-6 h-6 border border-red-900"><img src={newChar.referenceImage} alt="" className="w-full h-full object-cover" /></div>}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => {
                    const c = { ...newChar, id: Date.now().toString() };
                    setProject(p => ({ ...p, characters: [...p.characters, c] }));
                    setIsAddingChar(false);
                    setNewChar(INITIAL_NEW_CHAR);
                  }} className="flex-1 bg-red-950 text-[10px] py-2 font-bold tracking-widest hover:bg-red-900">BIND</button>
                  <button onClick={() => setIsAddingChar(false)} className="px-3 bg-zinc-800 text-[10px]">X</button>
                </div>
              </div>
            )}
            {project.characters.map(char => (
              <CharacterCodexItem 
                key={char.id} 
                char={char} 
                isSelected={selectedCharIds.includes(char.id)} 
                onToggle={id => setSelectedCharIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
              />
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-900">
            <button 
              onClick={handleSystemReset}
              className="text-[8px] text-red-900 hover:text-red-500 font-bold uppercase tracking-widest block w-full text-left"
            >
              Purge Project Archive
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
        <div className="absolute inset-0 overflow-auto scrollbar-hide">
          <div ref={canvasRef} className="min-w-[4000px] min-h-[4000px] relative">
            
            {activePage && activePage.panels.length > 0 && (
              <div 
                style={{ left: `${pageMarkerPos.x}px`, top: `${pageMarkerPos.y}px` }}
                className="absolute pointer-events-none flex items-baseline gap-5 select-none animate-in fade-in"
              >
                <span className="text-8xl font-serif text-red-900/10 -mt-2">
                  {activePage.number.toString().padStart(2, '0')}
                </span>
                <div className="flex flex-col border-l border-red-900/20 pl-4 py-1">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-800 font-bold mb-0.5">
                    {activeIssue?.title || 'Unknown Issue'}
                  </span>
                  <span className="text-[7px] uppercase tracking-[0.5em] text-zinc-900 font-bold">
                    INTERNAL ARCHIVE // PROJECT: OWB
                  </span>
                </div>
              </div>
            )}

            <div className="fixed top-8 left-[280px] z-10 pointer-events-none export-hide">
              <h2 className="text-4xl font-serif text-zinc-900 tracking-widest uppercase opacity-20">
                {activeIssue?.title} / PAGE {activePage?.number}
              </h2>
            </div>

            {activePage?.panels.map(panel => (
              <MovableFrame 
                key={panel.id}
                panel={panel}
                characters={project.characters}
                onDelete={id => updateActivePagePanels(ps => ps.filter(x => x.id !== id))}
                onUpdateRatio={(id, ratio) => updateActivePagePanels(ps => ps.map(p => p.id === id ? { ...p, aspectRatio: ratio } : p))}
                onBringToFront={id => updateActivePagePanels(ps => ps.map(p => p.id === id ? { ...p, zIndex: ++maxZRef.current } : p))}
                onMoveStart={(e, id) => {
                  const p = activePage.panels.find(x => x.id === id);
                  if (p) {
                    dragRef.current = { id, startX: e.clientX, startY: e.clientY, itemX: p.x, itemY: p.y };
                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleInteractionEnd);
                  }
                }}
                onResizeStart={(e, id) => {
                  const p = activePage.panels.find(x => x.id === id);
                  if (p) {
                    resizeRef.current = { id, startX: e.clientX, startWidth: p.width };
                    window.addEventListener('mousemove', handleResizeMove);
                    window.addEventListener('mouseup', handleInteractionEnd);
                  }
                }}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-[100] export-hide">
          {errorMsg && (
            <div className="bg-black border border-red-900 p-4 mb-4 text-[10px] text-red-500 uppercase tracking-widest animate-in slide-in-from-bottom-2 shadow-[0_0_20px_rgba(153,27,27,0.3)]">
              {errorMsg}
            </div>
          )}
          <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-5 shadow-2xl rounded-sm">
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-3">
                <textarea 
                  value={currentPrompt} 
                  onChange={e => setCurrentPrompt(e.target.value)}
                  placeholder="Direct cinematic script for the next frame..."
                  className="w-full bg-transparent border-none text-sm text-zinc-100 placeholder:text-zinc-700 outline-none resize-none h-24 font-light leading-relaxed"
                  onKeyDown={e => e.ctrlKey && e.key === 'Enter' && handleGenerate()}
                />
                
                <div className="flex gap-2 items-center">
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mr-2">Layout:</span>
                  {layouts.map(l => (
                    <button 
                      key={l.name}
                      onClick={() => setActiveLayout(l)}
                      className={`px-3 py-1 text-[9px] font-bold border transition-all ${activeLayout.name === l.name ? 'border-red-900 bg-red-950/20 text-red-500' : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'}`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-40 flex flex-col gap-2">
                <Button 
                  onClick={handleGenerate} 
                  isLoading={isGenerating}
                  className="w-full flex-1 bg-red-950/50 hover:bg-red-900/50 transition-colors"
                >
                  RENDER
                </Button>
                <div className="text-[7px] text-zinc-600 uppercase text-center font-bold tracking-tighter">
                  CTRL + ENTER
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
