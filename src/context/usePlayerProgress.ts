import { useContext } from 'react';
import { PlayerProgressContext } from './PlayerProgressContextSource';

export const usePlayerProgress = () => {
    const context = useContext(PlayerProgressContext);
    if (!context) throw new Error('usePlayerProgress must be used within a PlayerProvider');
    return context;
};
