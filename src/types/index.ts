export interface Song {
    id: string;
    name: string;
    type: string;
    year: string;
    duration: number;
    label: string;
    language: string;
    url: string;
    copyright: string;
    album: {
        id: string;
        name: string;
        url: string;
    };
    primaryArtists: string;
    image: Array<{ quality: string; link: string }>;
    downloadUrl: Array<{ quality: string; link: string }>;
}

export interface Artist {
    id: string;
    name: string;
    role: string;
    url: string;
    image: Array<{ quality: string; url: string }> | false;
    type: string;
}

export interface SearchResponse<T> {
    status: string;
    data: {
        total: number;
        start: number;
        results: T[];
    };
}
export interface UserProfile {
    id: string;
    name: string;
    avatar?: string;
    joinDate: string;
    stats?: {
        playlists: number;
        songs: number;
    };
}

export interface Playlist {
    id: string;
    name: string;
    description?: string;
    songs: Song[];
    createdAt: string;
}

export interface Album {
    id: string;
    name: string;
    type: string;
    year: string;
    image: Array<{ quality: string; link: string }>;
    artist: string;
    language: string;
    url?: string;
    songCount?: string;
}

export interface Chart {
    id: string;
    name: string;
    type: string;
    image: Array<{ quality: string; link: string }>;
    url?: string;
    firstname?: string;
}

export interface UserPreferences {
    volume: number;
    isShuffle: boolean;
    repeatMode: 'none' | 'all' | 'one';
}
