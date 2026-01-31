import { configureStore } from '@reduxjs/toolkit';
import panelsReducer from './features/panelsSlice';

export const store = configureStore({
    reducer: {
        panels: panelsReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

