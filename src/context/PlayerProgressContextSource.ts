import { createContext } from 'react';

export interface PlayerProgressContextType {
    progress: number;
    duration: number;
    seek: (time: number) => void;
}

export const PlayerProgressContext = createContext<PlayerProgressContextType | undefined>(undefined);
