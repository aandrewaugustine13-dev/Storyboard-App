import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateGalleryFrame } from './services/geminiService';
import { Character, StoryboardPanel, Issue, Page, Project, AspectRatio } from './types';
import { Button } from './components/Button';
import html2canvas from 'html2canvas';

// --- UTILS ---
const generateId = () => `id-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;

const createNewProject = (name: string): Project => {
  const projectId = generateId();
  const issueId = generateId();
  const pageId = generateId();
  return {
    id: projectId,
    name: name,
    issues: [{
      id: issueId,
      title: 'Issue #1: Genesis',
      pages: [{ id: pageId, number: 1, panels: [] }]
    }],
    characters: [],
    activeIssueId: issueId,
    activePageId: pageId
  };
};

const ASPECT_CLASSES: Record<AspectRatio, string> = {
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
  "4:3": "aspect-[4/3]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video"
};

const STORAGE_KEY = 'ink_tracker_v3';

// --- SUB-COMPONENTS ---

const CharacterCodexItem = React.memo(({ 
  char, 
  isSelected, 
  onToggle,
  onEdit,
  onDelete
}: { 
  char: Character; 
  isSelected: boolean; 
  onToggle: (id: string) => void; 
  onEdit: (char: Character) => void;
  onDelete: (id: string) => void;
}) => (
  <div 
    className={`group p-3 border transition-all cursor-pointer select-none mb-2 flex items-start gap-3 ${
      isSelected 
      ? 'bg-red-950/20 border-red-900 text-red-100' 
      : 'bg-black border-zinc-900 text-zinc-500 hover:border-zinc-700'
    }`}
  >
    <div onClick={() => onToggle(char.id)} className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex-shrink-0 overflow-hidden grayscale group-hover:grayscale-0 transition-all flex items-center justify-center">
      {char.referenceImage ? (
        <img src={char.referenceImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[10px] opacity-20">REF</span>
      )}
    </div>
    
    <div className="flex-1 min-w-0" onClick={() => onToggle(char.id)}>
      <div className="flex justify-between items-center mb-1">
        <p className="font-bold text-[10px] uppercase tracking-wider truncate">{char.name}</p>
        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />}
      </div>
      <p className="text-[7px] uppercase font-bold text-zinc-600 truncate">{char.archetype || 'Unnamed Archetype'}</p>
    </div>

    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
        onClick={(e) => { e.stopPropagation(); onEdit(char); }}
        className="text-[7px] text-zinc-500 hover:text-white uppercase font-bold"
      >
        Edit
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(char.id); }}
        className="text-[7px] text-red-950 hover:text-red-500 uppercase font-bold"
      >
        Del
      </button>
    </div>
  </div>
));

const MovableFrame = React.memo(({ 
  panel, 
  characters,
  onDelete, 
  onUpdateRatio, 
  onBringToFront, 
  onMoveStart,
  onResizeStart
}: { 
  panel: StoryboardPanel; 
  characters: Character[];
  onDelete: (id: string) => void; 
  onUpdateRatio: (id: string, ratio: AspectRatio) => void;
  onBringToFront: (id: string) => void;
  onMoveStart: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
}) => {
  const involved = characters.filter(c => panel.charactersInvolved.includes(c.id));
  
  return (
    <div 
      style={{ 
        left: `${panel.x}px`, 
        top: `${panel.y}px`, 
        width: `${panel.width}px`,
        zIndex: panel.zIndex
      }}
      className="absolute group animate-in zoom-in-95"
      onMouseDown={() => onBringToFront(panel.id)}
    >
      <div className="relative border border-zinc-800 bg-black group-hover:border-red-900 transition-colors shadow-2xl overflow-hidden">
        <div 
          className="h-8 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-3 cursor-move select-none"
          onMouseDown={(e) => onMoveStart(e, panel.id)}
        >
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Panel: {panel.id.slice(-4)}</span>
            <div className="flex gap-1">
              {(["16:9", "4:3", "1:1"] as AspectRatio[]).map(r => (
                <button 
                  key={r}
                  onClick={(e) => { e.stopPropagation(); onUpdateRatio(panel.id, r); }}
                  className={`text-[7px] font-bold px-1 ${panel.aspectRatio === r ? 'text-red-500' : 'text-zinc-700 hover:text-zinc-400'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(panel.id); }}
            className="text-zinc-700 hover:text-red-700 font-bold text-[10px] export-hide"
          >
            ×
          </button>
        </div>

        <div className={`relative ${ASPECT_CLASSES[panel.aspectRatio]} bg-zinc-900 overflow-hidden`}>
          <img 
            src={panel.imageUrl} 
            alt={panel.prompt} 
            className="w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
            <p className="text-[10px] text-zinc-400 font-light leading-relaxed italic line-clamp-2">{panel.prompt}</p>
          </div>
        </div>

        <div className="p-3 border-t border-zinc-900 flex flex-wrap gap-1.5 bg-black">
          {involved.map(c => (
            <span key={c.id} className="text-[7px] font-bold uppercase tracking-widest bg-zinc-900 text-zinc-500 px-1.5 py-0.5 border border-zinc-800">
              {c.name}
            </span>
          ))}
          {involved.length === 0 && <span className="text-[7px] font-bold uppercase text-zinc-800">No Identified Actors</span>}
        </div>

        <div 
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize export-hide z-20 group-hover:bg-red-900/10 flex items-center justify-center"
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, panel.id); }}
        >
          <div className="w-1.5 h-1.5 border-r border-b border-zinc-700" />
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [activeLayout, setActiveLayout] = useState<{name: string, ratio: AspectRatio}>({name: 'WIDE', ratio: '16:9'});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isEditingChar, setIsEditingChar] = useState(false);
  const [charForm, setCharForm] = useState<Character & { isNew?: boolean }>({ ...INITIAL_NEW_CHAR, id: '' });
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

  // --- API KEY SELECTION CHECK ---
  useEffect(() => {
    const checkApiKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed.projects && parsed.projects.length > 0) {
          setProjects(parsed.projects);
          setActiveProjectId(parsed.activeProjectId || parsed.projects[0].id);
        } else {
          const defaultProject = createNewProject('The Primary Archive');
          setProjects([defaultProject]);
          setActiveProjectId(defaultProject.id);
        }
      } catch(e) { 
        console.error("Storage load error:", e);
        const defaultProject = createNewProject('New Archive (Recovery)');
        setProjects([defaultProject]);
        setActiveProjectId(defaultProject.id);
      }
    } else {
      const defaultProject = createNewProject('The Primary Archive');
      setProjects([defaultProject]);
      setActiveProjectId(defaultProject.id);
    }
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, activeProjectId }));
      } catch(e: any) {
        if (e.name === 'QuotaExceededError') {
          setErrorMsg("STORAGE FULL: Local browser storage is at capacity. Delete older projects or panels to save new ones.");
        }
        console.error("Storage save error:", e);
      }
    }
  }, [projects, activeProjectId]);

  // --- SAFE SELECTORS ---
  const project = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || projects[0]
  , [projects, activeProjectId]);

  const activeIssue = useMemo(() => 
    project?.issues?.find(i => i.id === project.activeIssueId) || project?.issues?.[0]
  , [project]);

  const activePage = useMemo(() => 
    activeIssue?.pages?.find(p => p.id === project?.activePageId) || activeIssue?.pages?.[0]
  , [activeIssue, project?.activePageId]);

  const updateActiveProject = useCallback((updater: (p: Project) => Project) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? updater(p) : p));
  }, [activeProjectId]);

  const updateActivePagePanels = useCallback((updater: (panels: StoryboardPanel[]) => StoryboardPanel[]) => {
    updateActiveProject(prev => ({
      ...prev,
      issues: (prev.issues || []).map(issue => 
        issue.id === prev.activeIssueId 
        ? {
            ...issue,
            pages: (issue.pages || []).map(page => 
              page.id === prev.activePageId 
              ? { ...page, panels: updater(page.panels || []) }
              : page
            )
          }
        : issue
      )
    }));
  }, [updateActiveProject]);

  // --- HANDLERS ---

  // Fix: Added missing saveCharacter function to handle Codex updates.
  const saveCharacter = useCallback(() => {
    if (!charForm.name.trim()) return;
    updateActiveProject(p => {
      const chars = [...(p.characters || [])];
      if (charForm.isNew) {
        const { isNew, ...rest } = charForm;
        chars.push({ ...rest, id: generateId() });
      } else {
        const index = chars.findIndex(c => c.id === charForm.id);
        if (index !== -1) {
          const { isNew, ...rest } = charForm;
          chars[index] = { ...rest };
        }
      }
      return { ...p, characters: chars };
    });
    setIsEditingChar(false);
    setCharForm({ ...INITIAL_NEW_CHAR, id: '' });
  }, [charForm, updateActiveProject]);

  const handleNewProject = useCallback(() => {
    const name = window.prompt("Enter Project Name:");
    if (name && name.trim()) {
      const newProj = createNewProject(name.trim());
      setProjects(prev => [...prev, newProj]);
      setActiveProjectId(newProj.id);
    }
  }, []);

  const handleDeleteProject = useCallback(() => {
    if (projects.length <= 1) {
      alert("Cannot delete the only project archive.");
      return;
    }
    if (project && window.confirm(`Permanently delete project "${project.name}"?`)) {
      const remaining = projects.filter(p => p.id !== project.id);
      setProjects(remaining);
      setActiveProjectId(remaining[0].id);
    }
  }, [projects, project]);

  const handleNewIssue = useCallback(() => {
    const nid = generateId();
    const pid = generateId();
    updateActiveProject(prev => ({
      ...prev,
      issues: [...(prev.issues || []), { 
        id: nid, 
        title: `Issue #${prev.issues.length + 1}`, 
        pages: [{ id: pid, number: 1, panels: [] }] 
      }],
      activeIssueId: nid,
      activePageId: pid
    }));
  }, [updateActiveProject]);

  const handleDeleteIssue = useCallback((issueId: string) => {
    if (project.issues.length <= 1) {
      alert("Archive must contain at least one issue.");
      return;
    }
    if (window.confirm("Purge issue and all contained pages?")) {
      updateActiveProject(prev => {
        const filtered = prev.issues.filter(i => i.id !== issueId);
        const nextIssue = filtered[0];
        return { 
          ...prev, 
          issues: filtered, 
          activeIssueId: nextIssue.id, 
          activePageId: nextIssue.pages[0].id 
        };
      });
    }
  }, [project, updateActiveProject]);

  const handleNewPage = useCallback((issueId: string) => {
    const pid = generateId();
    updateActiveProject(p => ({
      ...p,
      issues: p.issues.map(i => i.id === issueId ? { 
        ...i, 
        pages: [...i.pages, { id: pid, number: i.pages.length + 1, panels: [] }] 
      } : i),
      activePageId: pid
    }));
  }, [updateActiveProject]);

  const handleDeletePage = useCallback((issueId: string, pageId: string) => {
    const issue = project.issues.find(i => i.id === issueId);
    if (issue && issue.pages.length <= 1) {
      alert("Cannot delete the only page. Use Delete Issue instead.");
      return;
    }
    if (window.confirm("Purge page and all panels?")) {
      updateActiveProject(p => ({
        ...p,
        issues: p.issues.map(i => i.id === issueId ? { 
          ...i, 
          pages: i.pages.filter(pg => pg.id !== pageId).map((pg, idx) => ({ ...pg, number: idx + 1 })) 
        } : i),
        activePageId: issue?.pages.find(pg => pg.id !== pageId)?.id || ''
      }));
    }
  }, [project, updateActiveProject]);

  const handleExportImage = async () => {
    if (!canvasRef.current || !activePage || !activePage.panels?.length) return;
    setIsExporting(true);
    setErrorMsg(null);
    try {
      const panels = activePage.panels;
      const minX = Math.max(0, Math.min(...panels.map(p => p.x)) - 50);
      const minY = Math.max(0, Math.min(...panels.map(p => p.y)) - 180);
      const maxX = Math.max(...panels.map(p => p.x + p.width)) + 50;
      const maxY = Math.max(...panels.map(p => p.y + (p.width * (9/16)) + 200)) + 50;

      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        backgroundColor: '#020202',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        scale: 1,
        logging: false
      });

      const link = document.createElement('a');
      link.download = `INK_${project.name}_Page${activePage.number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      setErrorMsg("Export failed. Memory exhaustion likely.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    updateActivePagePanels(panels => panels.map(p => p.id === dragRef.current?.id ? { 
      ...p, 
      x: dragRef.current!.itemX + deltaX, 
      y: dragRef.current!.itemY + deltaY 
    } : p));
  }, [updateActivePagePanels]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return;
    const deltaX = e.clientX - resizeRef.current.startX;
    const newWidth = Math.max(200, Math.min(1200, resizeRef.current.startWidth + deltaX));
    updateActivePagePanels(panels => panels.map(p => p.id === resizeRef.current?.id ? { ...p, width: newWidth } : p));
  }, [updateActivePagePanels]);

  const handleInteractionEnd = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleInteractionEnd);
  }, [handleMouseMove, handleResizeMove]);

  const handleGenerate = async () => {
    if (!currentPrompt.trim() || isGenerating || !activePage) return;
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const activeChars = (project.characters || []).filter(c => selectedCharIds.includes(c.id));
      const imageUrl = await generateGalleryFrame(currentPrompt, activeChars, activePage.panels || [], activeLayout.ratio);
      
      const newPanel: StoryboardPanel = {
        id: generateId(),
        prompt: currentPrompt,
        imageUrl,
        timestamp: Date.now(),
        charactersInvolved: [...selectedCharIds],
        x: 150 + ((activePage.panels?.length || 0) * 30),
        y: 150 + ((activePage.panels?.length || 0) * 30),
        width: activeLayout.ratio === '16:9' ? 500 : 400,
        aspectRatio: activeLayout.ratio,
        zIndex: ++maxZRef.current
      };

      updateActivePagePanels(prev => [newPanel, ...(prev || [])]);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setErrorMsg("API Key invalid. Reconnect required.");
      } else {
        setErrorMsg(err.message || "Manifest failed.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSystemReset = useCallback(() => {
    if (window.confirm("CRITICAL: Wipe all archive data? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  }, []);

  const pageMarkerPos = useMemo(() => {
    if (!activePage?.panels || activePage.panels.length === 0) return { x: 100, y: 100 };
    const minX = Math.min(...activePage.panels.map(p => p.x));
    const minY = Math.min(...activePage.panels.map(p => p.y));
    return { x: Math.max(50, minX), y: Math.max(50, minY - 120) };
  }, [activePage]);

  if (!project) return null;

  if (hasApiKey === false) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#020202] text-zinc-300 p-8 text-center z-[9999]">
        <h1 className="font-serif text-4xl text-red-700 leading-none uppercase mb-4 tracking-tighter">PIPELINE OFFLINE</h1>
        <p className="max-w-md text-sm text-zinc-500 mb-8 leading-relaxed">Connect your Google Cloud project to resume rendering operations.</p>
        <Button onClick={handleOpenSelectKey} className="px-12 py-4">Authorize API Key</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-[#020202] text-zinc-300 overflow-hidden">
      
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col z-50 shadow-2xl">
        <div className="p-5 border-b border-zinc-900">
          <h1 className="font-serif text-lg text-red-700 leading-none uppercase">INK TRACKER</h1>
          <p className="text-[8px] uppercase tracking-widest mt-1 text-zinc-600">Visual Dossier Suite</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="mb-8">
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 flex justify-between items-center">
              Project Archive
              <button onClick={handleNewProject} className="text-red-900 hover:text-red-500 text-[10px] font-bold">NEW</button>
            </h3>
            <select 
              value={activeProjectId || ''} 
              onChange={e => setActiveProjectId(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-[10px] p-2 outline-none focus:border-red-900 uppercase font-bold text-zinc-400"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="mb-8">
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 flex justify-between items-center">
              Active Issues
              <button onClick={handleNewIssue} className="text-red-900 hover:text-red-500 text-[12px] font-bold">+</button>
            </h3>
            {project.issues?.map(issue => (
              <div key={issue.id} className="mb-4">
                <div className={`group flex justify-between items-center text-[10px] font-bold mb-1 p-1 truncate ${project.activeIssueId === issue.id ? 'text-zinc-200' : 'text-zinc-600'}`}>
                  <span className="truncate flex-1">{issue.title}</span>
                  <button onClick={() => handleDeleteIssue(issue.id)} className="opacity-0 group-hover:opacity-100 text-red-900 hover:text-red-500 font-bold">DEL</button>
                </div>
                <div className="pl-2 border-l border-zinc-900 space-y-1">
                  {issue.pages?.map(page => (
                    <div key={page.id} className="group flex items-center">
                      <button 
                        onClick={() => updateActiveProject(p => ({ ...p, activeIssueId: issue.id, activePageId: page.id }))}
                        className={`flex-1 text-left text-[10px] px-2 py-1 transition-colors ${project.activePageId === page.id && project.activeIssueId === issue.id ? 'bg-red-950/20 text-red-500 border-l border-red-900' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Page {page.number}
                      </button>
                      <button onClick={() => handleDeletePage(issue.id, page.id)} className="opacity-0 group-hover:opacity-100 px-2 text-red-900 text-[7px] font-bold">X</button>
                    </div>
                  ))}
                  <button onClick={() => handleNewPage(issue.id)} className="text-[9px] text-zinc-700 px-2 py-1 hover:text-zinc-400 italic">+ New Page</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-8">
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 flex justify-between items-center">
              Codex
              <button onClick={() => { setCharForm({ ...INITIAL_NEW_CHAR, id: '', isNew: true } as any); setIsEditingChar(true); }} className="text-red-900 text-[10px] font-bold">ADD</button>
            </h3>
            
            {isEditingChar && (
              <div className="bg-zinc-900 p-3 border border-red-950 mb-4 space-y-2 animate-in fade-in">
                <input placeholder="Full Name" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900" value={charForm.name} onChange={e => setCharForm(p => ({...p, name: e.target.value}))} />
                <input placeholder="Archetype" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900" value={charForm.archetype} onChange={e => setCharForm(p => ({...p, archetype: e.target.value}))} />
                <textarea placeholder="Visual Traits" className="w-full bg-black text-[10px] p-2 outline-none border border-zinc-800 focus:border-red-900 h-16 resize-none" value={charForm.traits} onChange={e => setCharForm(p => ({...p, traits: e.target.value}))} />
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-zinc-800 text-[9px] py-1 font-bold uppercase hover:bg-zinc-700">Ref Img</button>
                  {charForm.referenceImage && <div className="w-6 h-6 border border-red-900"><img src={charForm.referenceImage} alt="" className="w-full h-full object-cover" /></div>}
                </div>
                <input type="file" ref={fileInputRef} onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const r = new FileReader();
                    r.onloadend = () => setCharForm(p => ({ ...p, referenceImage: r.result as string }));
                    r.readAsDataURL(file);
                  }
                }} className="hidden" accept="image/*" />
                <div className="flex gap-2 pt-2">
                  <button onClick={saveCharacter} className="flex-1 bg-red-950 text-[10px] py-2 font-bold hover:bg-red-900 uppercase">Bind</button>
                  <button onClick={() => setIsEditingChar(false)} className="px-3 bg-zinc-800 text-[10px]">X</button>
                </div>
              </div>
            )}

            {(project.characters || []).map(char => (
              <CharacterCodexItem 
                key={char.id} 
                char={char} 
                isSelected={selectedCharIds.includes(char.id)} 
                onToggle={id => setSelectedCharIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                onEdit={c => { setCharForm(c); setIsEditingChar(true); }}
                onDelete={id => { if (confirm("Delete character?")) updateActiveProject(p => ({ ...p, characters: p.characters.filter(c => c.id !== id) })); }}
              />
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-900 space-y-2">
            <button onClick={handleDeleteProject} className="text-[8px] text-zinc-700 hover:text-red-900 font-bold uppercase w-full text-left">Delete Project</button>
            <button onClick={handleSystemReset} className="text-[8px] text-red-900 hover:text-red-500 font-bold uppercase w-full text-left">Wipe Data</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
        <div className="absolute inset-0 overflow-auto scrollbar-hide">
          <div ref={canvasRef} className="min-w-[4000px] min-h-[4000px] relative">
            
            {activePage && activePage.panels?.length > 0 && (
              <div 
                style={{ left: `${pageMarkerPos.x}px`, top: `${pageMarkerPos.y}px` }}
                className="absolute pointer-events-none flex items-baseline gap-5 select-none animate-in fade-in"
              >
                <span className="text-8xl font-serif text-red-900/10 -mt-2">{activePage.number.toString().padStart(2, '0')}</span>
                <div className="flex flex-col border-l border-red-900/20 pl-4 py-1">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-800 font-bold mb-0.5">{project.name} // {activeIssue?.title}</span>
                  <span className="text-[7px] uppercase tracking-[0.5em] text-zinc-900 font-bold">INTERNAL ARCHIVE // PROJECT: {project.id.slice(0,8)}</span>
                </div>
              </div>
            )}

            {activePage?.panels?.map(panel => (
              <MovableFrame 
                key={panel.id}
                panel={panel}
                characters={project.characters || []}
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
              <button onClick={() => setErrorMsg(null)} className="ml-4 text-white">×</button>
            </div>
          )}
          <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-5 shadow-2xl rounded-sm">
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-3">
                <textarea 
                  value={currentPrompt} 
                  onChange={e => setCurrentPrompt(e.target.value)}
                  placeholder="Cinematic script for the frame..."
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
                <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full flex-1">RENDER</Button>
                <div className="text-[7px] text-zinc-600 uppercase text-center font-bold tracking-tighter">
                   <div className="mb-1">CTRL + ENTER</div>
                   <button onClick={handleExportImage} disabled={isExporting} className="hover:text-zinc-300 transition-colors uppercase">
                     {isExporting ? 'Capturing...' : 'Export Page'}
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
