import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Panel {
    id: string;
    content: string;
}

interface PanelsState {
    panels: Panel[];
}

const initialState: PanelsState = {
    panels: [],
};

const panelsSlice = createSlice({
    name: 'panels',
    initialState,
    reducers: {
        addPanel: (state, action: PayloadAction<Panel>) => {
            state.panels.push(action.payload);
        },
        removePanel: (state, action: PayloadAction<string>) => {
            state.panels = state.panels.filter(p => p.id !== action.payload);
        },
        updatePanelContent: (state, action: PayloadAction<{ id: string; content: string }>) => {
            const panel = state.panels.find((p) => p.id === action.payload.id);
            if (panel) {
                panel.content = action.payload.content;
            }
        },
    },
});

export const { addPanel, removePanel, updatePanelContent } = panelsSlice.actions;
export default panelsSlice.reducer;
