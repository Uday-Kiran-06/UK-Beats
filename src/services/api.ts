import type { Song, SearchResponse } from '../types';

const API_BASE = 'https://jiosaavn-api-privatecvc2.vercel.app';

export const MusicAPI = {
    searchSongs: async (query: string, page: number = 1, limit: number = 10): Promise<SearchResponse<Song>> => {
        try {
            const response = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('API request failed');
            return await response.json();
        } catch (error) {
            console.error('Error searching songs:', error);
            throw error;
        }
    },

    getSongById: async (id: string): Promise<{ status: string; data: Song[] }> => {
        try {
            const response = await fetch(`${API_BASE}/songs?id=${id}`);
            if (!response.ok) throw new Error('API request failed');
            return await response.json();
        } catch (error) {
            console.error('Error fetching song details:', error);
            throw error;
        }
    },

    getTrending: async (): Promise<any> => {
        try {
            const response = await fetch(`${API_BASE}/modules?language=english`);
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error("Error fetching trending data:", error);
            throw error;
        }
    },
    getPlaylist: async (id: string): Promise<any> => {
        try {
            const response = await fetch(`${API_BASE}/playlists?id=${id}`);
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error("Error fetching playlist:", error);
            throw error;
        }
    },
    getSuggestions: async (id: string): Promise<any> => {
        try {
            const response = await fetch(`${API_BASE}/songs/${id}/suggestions`);
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error("Error fetching suggestions:", error);
            throw error;
        }
    }
};
