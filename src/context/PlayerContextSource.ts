import { createContext } from 'react';
import type { Song } from '../types';

export type RepeatMode = 'none' | 'all' | 'one';

export interface PlayerContextType {
    currentSong: Song | null;
    isPlaying: boolean;
    queue: Song[];
    isShuffle: boolean;
    repeatMode: RepeatMode;
    volume: number;
    playSong: (song: Song, newQueue?: Song[], searchContext?: { query: string; page: number }) => void;
    togglePlay: () => void;
    nextSong: () => void;
    prevSong: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    setVolume: (volume: number) => void;
}

export const PlayerContext = createContext<PlayerContextType | undefined>(undefined);
