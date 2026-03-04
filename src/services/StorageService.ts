import type { UserProfile, Playlist, UserPreferences, Song } from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEYS = {
    PROFILE: 'uk_beats_profile',
    PLAYLISTS: 'uk_beats_playlists',
    PREFERENCES: 'uk_beats_preferences'
};

export const StorageService = {
    // User Profile
    getProfile: (): UserProfile | null => {
        const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
        return data ? JSON.parse(data) : null;
    },
    saveProfile: (profile: UserProfile): void => {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    },

    // Supabase Sync for Profile
    syncProfileToCloud: async (userId: string, profile: UserProfile) => {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                name: profile.name,
                avatar_url: profile.avatar,
                stats: profile.stats,
                updated_at: new Error().stack // Simple way to force update
            });
        return { error };
    },
    fetchProfileFromCloud: async (userId: string): Promise<UserProfile | null> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error || !data) return null;
        return {
            id: data.id,
            name: data.name || '',
            avatar: data.avatar_url || '',
            stats: data.stats || { playlists: 0, songs: 0 },
            joinDate: data.updated_at
        };
    },

    // Playlists
    getPlaylists: (): Playlist[] => {
        const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
        return data ? JSON.parse(data) : [];
    },
    savePlaylist: (playlist: Playlist): void => {
        const playlists = StorageService.getPlaylists();
        const index = playlists.findIndex(p => p.id === playlist.id);
        if (index >= 0) {
            playlists[index] = playlist;
        } else {
            playlists.push(playlist);
        }
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    },

    // Supabase Sync for Playlists
    syncPlaylistsToCloud: async (userId: string, playlists: Playlist[]) => {
        const cloudPlaylists = playlists.map(p => ({
            user_id: userId,
            name: p.name,
            songs: p.songs,
            created_at: p.id.includes('-') ? undefined : new Date(parseInt(p.id)).toISOString()
        }));

        const { error } = await supabase
            .from('playlists')
            .upsert(cloudPlaylists, { onConflict: 'user_id, name' });

        return { error };
    },
    fetchPlaylistsFromCloud: async (userId: string): Promise<Playlist[]> => {
        const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', userId);
        if (error || !data) return [];
        return data.map(p => ({
            id: p.created_at ? new Date(p.created_at).getTime().toString() : Date.now().toString(), // basic ID fallback
            name: p.name,
            songs: p.songs || [],
            createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : new Date().toLocaleDateString()
        }));
    },

    deletePlaylist: (id: string): void => {
        const playlists = StorageService.getPlaylists().filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    },
    addSongToPlaylist: (playlistId: string, song: Song): void => {
        const playlists = StorageService.getPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            const songExists = playlist.songs.some(s => s.id === song.id);
            if (!songExists) {
                playlist.songs.push(song);
                StorageService.savePlaylist(playlist);
            }
        }
    },

    // Preferences
    getPreferences: (): UserPreferences => {
        const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
        return data ? JSON.parse(data) : {
            volume: 100,
            isShuffle: false,
            repeatMode: 'none'
        };
    },
    savePreferences: (prefs: UserPreferences): void => {
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
    }
};
