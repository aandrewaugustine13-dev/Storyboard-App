import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Panel, Group } from 'react-resizable-panels';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updatePanelContent } from '../features/panelsSlice';
import { GripVertical, Edit, Save, X, Trash2 } from 'lucide-react';

interface PanelCardProps {
    id: string;
    index: number;
    onRemove: (id: string) => void;
    onGenerateImage: (prompt: string) => Promise<string | null>;
}

const PanelCard: React.FC<PanelCardProps> = ({ id, index, onRemove, onGenerateImage }) => {
    const dispatch = useDispatch();
    const panelContent = useSelector((state: RootState) => state.panels.panels.find(p => p.id === id)?.content || '');
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(panelContent);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSave = () => {
        dispatch(updatePanelContent({ id, content: editedContent }));
        setIsEditing(false);
    };

    const handleGenerate = async () => {
        const url = await onGenerateImage(prompt);
        if (url) {
            setImageUrl(url);
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="border rounded-md p-2 bg-card">
        <Group direction="horizontal" className="gap-2">
        <Panel defaultSize={10} minSize={5}>
        <div {...attributes} {...listeners} className="cursor-grab touch-none h-full flex items-center justify-center">
        <GripVertical size={20} className="text-muted-foreground" />
        </div>
        </Panel>
        <Panel defaultSize={80}>
        <div className="flex-1">
        <h3 className="text-sm font-semibold mb-2">Panel {index + 1}</h3>
        {isEditing ? (
            <div className="space-y-2">
            <textarea
            value={editedContent}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedContent(e.target.value)}
            rows={4}
            className="w-full border rounded px-2 py-1 text-sm bg-ink-950 border-ink-700 text-steel-300 focus:border-ember-500 outline-none"
            />
            <div className="flex space-x-2">
            <button
            onClick={handleSave}
            className="flex items-center px-3 py-1 text-sm bg-ember-500 text-ink-950 rounded hover:bg-ember-400 transition-colors"
            >
            <Save size={16} className="mr-1" /> Save
            </button>
            <button
            onClick={() => setIsEditing(false)}
            className="flex items-center px-3 py-1 text-sm border border-ink-700 text-steel-400 rounded hover:bg-ink-700 transition-colors"
            >
            <X size={16} className="mr-1" /> Cancel
            </button>
            </div>
            </div>
        ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{panelContent || 'Empty panel'}</p>
        )}
        <div className="mt-4">
        <input
        type="text"
        placeholder="Enter prompt for image generation"
        value={prompt}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
        className="w-full mb-2 border rounded px-2 py-1 text-sm bg-ink-950 border-ink-700 text-steel-300 focus:border-ember-500 outline-none"
        />
        <button
        onClick={handleGenerate}
        className="px-3 py-1 text-sm bg-ember-500 text-ink-950 rounded hover:bg-ember-400 transition-colors"
        >
        Generate Image
        </button>
        {imageUrl && <img src={imageUrl} alt="Generated panel" className="mt-2 max-w-full rounded" />}
        </div>
        </div>
        </Panel>
        <Panel defaultSize={10} minSize={5}>
        <div className="flex space-x-2">
        <button
        onClick={() => setIsEditing(true)}
        className="p-2 text-steel-400 hover:text-ember-500 transition-colors"
        >
        <Edit size={16} />
        </button>
        <button
        onClick={() => onRemove(id)}
        className="p-2 text-steel-400 hover:text-red-500 transition-colors"
        >
        <Trash2 size={16} />
        </button>
        </div>
        </Panel>
        </Group>
        </div>
    );
};

export default PanelCard;
