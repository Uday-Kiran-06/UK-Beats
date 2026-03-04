import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Song } from '../types';
import type { RepeatMode } from './PlayerContextSource';
import { StorageService } from '../services/StorageService';
import { MusicAPI } from '../services/api';
import { PlayerContext } from './PlayerContextSource';
import { PlayerProgressContext } from './PlayerProgressContextSource';

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState<Song[]>([]);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isShuffle, setIsShuffle] = useState(() => StorageService.getPreferences().isShuffle);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => StorageService.getPreferences().repeatMode || 'none');
    const [volume, setVolume] = useState(() => StorageService.getPreferences().volume);
    const [searchContext, setSearchContext] = useState<{ query: string; page: number } | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Keep a ref of the latest state to avoid closure issues in event listeners
    const stateRef = useRef({ currentSong, queue, isShuffle, repeatMode, volume, searchContext });
    useEffect(() => {
        stateRef.current = { currentSong, queue, isShuffle, repeatMode, volume, searchContext };
    }, [currentSong, queue, isShuffle, repeatMode, volume, searchContext]);

    // Persist preferences
    useEffect(() => {
        StorageService.savePreferences({ volume, isShuffle, repeatMode });
    }, [volume, isShuffle, repeatMode]);

    const playSong = async (song: Song, newQueue?: Song[], context?: { query: string; page: number }) => {
        let finalSong = song;

        // If the song is missing download URLs (e.g., from a dashboard endpoint queue), fetch full details
        if (!song.downloadUrl || (Array.isArray(song.downloadUrl) && song.downloadUrl.length === 0)) {
            try {
                const res = await MusicAPI.getSongById(song.id);
                if (res?.status === 'SUCCESS' && res.data && res.data.length > 0) {
                    finalSong = {
                        ...res.data[0],
                        primaryArtists: Array.isArray(res.data[0].primaryArtists)
                            ? res.data[0].primaryArtists.map((a: any) => a.name || '').filter(Boolean).join(', ') || 'Unknown Artist'
                            : (typeof res.data[0].primaryArtists === 'string' ? res.data[0].primaryArtists : 'Unknown Artist'),
                        image: Array.isArray(res.data[0].image) ? res.data[0].image : [],
                        downloadUrl: Array.isArray(res.data[0].downloadUrl) ? res.data[0].downloadUrl : [],
                    };

                    // Update this song inside the current queue if we're not providing a new queue
                    if (!newQueue && queue.length > 0) {
                        setQueue(prevQueue => prevQueue.map(s => s.id === finalSong.id ? finalSong : s));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch full song details in playSong:', err);
            }
        }

        setCurrentSong(finalSong);
        if (newQueue) setQueue(newQueue.map(s => s.id === finalSong.id ? finalSong : s));
        if (context) setSearchContext(context);
        else if (newQueue) setSearchContext(null); // Clear context if playing a standard playlist

        // Get highest quality audio — guard against missing/non-array downloadUrl
        const downloadUrls = Array.isArray(finalSong.downloadUrl) ? finalSong.downloadUrl : [];
        const audioUrl = downloadUrls.length > 0
            ? [...downloadUrls].sort((a, b) => parseInt(b.quality) - parseInt(a.quality))[0]?.link
            : undefined;

        if (audioRef.current && audioUrl) {
            audioRef.current.src = audioUrl;
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(err => console.error("Playback failed", err));
        }
    };

    const nextSong = () => {
        const { currentSong: s_current, queue: s_queue, isShuffle: s_shuffle, repeatMode: s_repeat } = stateRef.current;
        if (!s_current || s_queue.length === 0) return;

        if (s_repeat === 'one') {
            playSong(s_current);
            return;
        }

        if (s_shuffle) {
            let randomIndex = Math.floor(Math.random() * s_queue.length);
            if (s_queue.length > 1 && s_queue[randomIndex].id === s_current.id) {
                randomIndex = (randomIndex + 1) % s_queue.length;
            }
            playSong(s_queue[randomIndex]);
            return;
        }

        const currentIndex = s_queue.findIndex((s: Song) => s.id === s_current.id);
        if (currentIndex >= 0 && currentIndex < s_queue.length - 1) {
            playSong(s_queue[currentIndex + 1]);
        } else if (currentIndex === s_queue.length - 1) {
            // Loop back to beginning if repeat-all
            if (s_repeat === 'all') { playSong(s_queue[0]); return; }
            // End of queue: Check for search context for genre-aware autoplay
            if (searchContext && searchContext.query) {
                const nextPage = searchContext.page + 1;
                MusicAPI.searchSongs(searchContext.query, nextPage, 20).then(res => {
                    if (res.status === 'SUCCESS' && res.data.results && res.data.results.length > 0) {
                        const newSongs = res.data.results.filter((s: Song) => !s_queue.some(qs => qs.id === s.id));
                        if (newSongs.length > 0) {
                            setQueue(prev => [...prev, ...newSongs]);
                            setSearchContext({ ...searchContext, page: nextPage });
                            playSong(newSongs[0]);
                        }
                    } else {
                        // Fallback to suggestions if no more search results
                        fetchAndPlaySuggestions(s_current, s_queue);
                    }
                }).catch(() => fetchAndPlaySuggestions(s_current, s_queue));
            } else {
                fetchAndPlaySuggestions(s_current, s_queue);
            }
        }
    };

    const fetchAndPlaySuggestions = (song: Song, currentQueue: Song[]) => {
        const language = typeof song.language === 'string' && song.language.trim() !== '' ? song.language.toLowerCase() : null;

        if (language && language !== 'unknown') {
            const randomPage = Math.floor(Math.random() * 10) + 1;
            MusicAPI.searchSongs(`${language} songs`, randomPage, 20).then(res => {
                if (res.status === 'SUCCESS' && res.data.results && res.data.results.length > 0) {
                    const newSongs = res.data.results.filter((s: Song) => !currentQueue.some(qs => qs.id === s.id));
                    if (newSongs.length > 0) {
                        setQueue(prev => [...prev, ...newSongs]);
                        playSong(newSongs[0]);
                        return;
                    }
                }
                fetchStandardSuggestions(song, currentQueue);
            }).catch(() => fetchStandardSuggestions(song, currentQueue));
        } else {
            fetchStandardSuggestions(song, currentQueue);
        }
    };

    const fetchStandardSuggestions = (song: Song, currentQueue: Song[]) => {
        MusicAPI.getSuggestions(song.id).then(res => {
            if (res.status === 'SUCCESS' && res.data && res.data.length > 0) {
                const suggestions = res.data;
                const newSongs = suggestions.filter((s: Song) => !currentQueue.some(qs => qs.id === s.id));
                if (newSongs.length > 0) {
                    setQueue(prev => [...prev, ...newSongs]);
                    playSong(newSongs[0]);
                }
            }
        }).catch(err => console.error("Autoplay suggestions failed", err));
    };

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
        const audio = audioRef.current;

        const updateProgress = () => {
            setProgress(audio.currentTime);
        };

        const handleEnded = () => {
            nextSong();
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        // Apply initial volume
        audio.volume = volume / 100;

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    // Update audio volume when state changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume]);

    // Update Media Session API for background play
    useEffect(() => {
        if ('mediaSession' in navigator && currentSong) {
            const artistName = Array.isArray(currentSong.primaryArtists)
                ? (currentSong.primaryArtists as any[]).map((a: any) => a.name || '').filter(Boolean).join(', ') || 'Unknown Artist'
                : (currentSong.primaryArtists || 'Unknown Artist');

            const imageArr = Array.isArray(currentSong.image) ? currentSong.image : [];
            const artworks = imageArr.map(img => ({
                src: img.link,
                sizes: img.quality === '500x500' ? '500x500' : (img.quality === '150x150' ? '150x150' : '50x50'),
                type: 'image/jpeg'
            }));

            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.name,
                artist: artistName,
                album: currentSong.album?.name || 'Unknown Album',
                artwork: artworks,
            });

            // Update playback state
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

            // Basic Handlers
            navigator.mediaSession.setActionHandler('play', () => { togglePlay(); });
            navigator.mediaSession.setActionHandler('pause', () => { togglePlay(); });
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);

            // Seek Handlers
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime !== undefined) {
                    seek(details.seekTime);
                }
            });

            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                const off = details.seekOffset || 10;
                seek(Math.max(0, (audioRef.current?.currentTime || 0) - off));
            });

            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                const off = details.seekOffset || 10;
                seek(Math.min(duration, (audioRef.current?.currentTime || 0) + off));
            });
        }
    }, [currentSong, isPlaying, duration]);


    const togglePlay = () => {
        if (!audioRef.current || !currentSong) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const seek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setProgress(time);
        }
    };

    const prevSong = () => {
        const { currentSong: s_current, queue: s_queue } = stateRef.current;
        if (!s_current || s_queue.length === 0) return;

        // If song is playing for more than 3 seconds, previous restarts it
        if (audioRef.current && audioRef.current.currentTime > 3) {
            seek(0);
            return;
        }

        const currentIndex = s_queue.findIndex((s: Song) => s.id === s_current.id);
        if (currentIndex > 0) {
            playSong(s_queue[currentIndex - 1]);
        }
    };

    const toggleShuffle = () => setIsShuffle(!isShuffle);
    // Cycle: none → all → one → none
    const toggleRepeat = () => setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none');

    const playerValue = useMemo(() => ({
        currentSong, isPlaying, queue, isShuffle, repeatMode, volume,
        playSong, togglePlay, nextSong, prevSong, toggleShuffle, toggleRepeat, setVolume
    }), [currentSong, isPlaying, queue, isShuffle, repeatMode, volume]);

    const progressValue = useMemo(() => ({
        progress, duration, seek
    }), [progress, duration]);

    return (
        <PlayerContext.Provider value={playerValue}>
            <PlayerProgressContext.Provider value={progressValue}>
                {children}
            </PlayerProgressContext.Provider>
        </PlayerContext.Provider>
    );
};
