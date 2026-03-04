import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, Shuffle, Repeat, ChevronDown } from 'lucide-react';
import { usePlayer } from '../context/usePlayer';
import { usePlayerProgress } from '../context/usePlayerProgress';

const PlayerBar: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const {
        currentSong, isPlaying, togglePlay,
        nextSong, prevSong, isShuffle, repeatMode, toggleShuffle, toggleRepeat,
        volume, setVolume
    } = usePlayer();

    const { progress, duration, seek } = usePlayerProgress();

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(Number(e.target.value));
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        seek(Number(e.target.value));
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleDownload = () => {
        if (!currentSong) return;
        const urls = Array.isArray(currentSong.downloadUrl) ? currentSong.downloadUrl : [];
        const url = [...urls].sort((a, b) => parseInt(b.quality) - parseInt(a.quality))[0]?.link;
        if (url) window.open(url, '_blank');
    };

    if (!currentSong) return null;

    const ACCENT = 'var(--accent-primary, #ff2a5f)';

    const repeatTitle = repeatMode === 'none' ? 'Repeat Off' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One';

    return (
        <div className={`player-bar glass-panel ${isExpanded ? 'expanded' : ''}`}>
            {isExpanded && (
                <button className="btn-collapse" onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}>
                    <ChevronDown size={24} />
                </button>
            )}

            <div className="now-playing" onClick={() => !isExpanded && setIsExpanded(true)}>
                <img
                    src={Array.isArray(currentSong.image) ? (currentSong.image[currentSong.image.length - 1]?.link || '') : ''}
                    alt="cover"
                    className="track-img"
                />
                <div className="track-info">
                    <h4 className="track-title">{currentSong.name}</h4>
                    <p className="track-artist">{currentSong.primaryArtists || 'Unknown'}</p>
                </div>
            </div>

            <div className="player-controls">
                <div className="control-buttons">

                    {/* Shuffle — colored icon + dot when on */}
                    <button className="btn-icon" onClick={toggleShuffle} title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}>
                        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Shuffle size={18} color={isShuffle ? ACCENT : 'currentColor'} />
                            <span style={{
                                width: 4, height: 4, borderRadius: '50%',
                                background: isShuffle ? ACCENT : 'transparent',
                                display: 'block', flexShrink: 0
                            }} />
                        </span>
                    </button>

                    <button className="btn-icon" onClick={prevSong}><SkipBack size={20} /></button>
                    <button className="btn-play" onClick={togglePlay}>
                        {isPlaying
                            ? <Pause size={24} fill="currentColor" />
                            : <Play size={24} fill="currentColor" className="play-icon-offset" />
                        }
                    </button>
                    <button className="btn-icon" onClick={nextSong}><SkipForward size={20} /></button>

                    {/* Repeat — shows Repeat icon always, adds "1" badge in repeat-one mode */}
                    <button className="btn-icon" onClick={toggleRepeat} title={repeatTitle}>
                        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}>
                            {/* "1" badge on top-right corner for repeat-one */}
                            {repeatMode === 'one' && (
                                <span style={{
                                    position: 'absolute', top: -4, right: -6,
                                    fontSize: 9, fontWeight: 800, lineHeight: 1,
                                    color: ACCENT, pointerEvents: 'none'
                                }}>1</span>
                            )}
                            <Repeat size={18} color={repeatMode !== 'none' ? ACCENT : 'currentColor'} />
                            <span style={{
                                width: 4, height: 4, borderRadius: '50%',
                                background: repeatMode !== 'none' ? ACCENT : 'transparent',
                                display: 'block', flexShrink: 0
                            }} />
                        </span>
                    </button>

                </div>

                <div className="playback-bar">
                    <span className="time">{formatTime(progress)}</span>
                    <input
                        type="range"
                        className="seek-slider"
                        min="0"
                        max={duration || 100}
                        value={progress}
                        onChange={handleSeek}
                        style={{
                            background: `linear-gradient(to right, #ffffff ${(progress / (duration || 1)) * 100}%, rgba(255, 255, 255, 0.2) ${(progress / (duration || 1)) * 100}%)`
                        }}
                    />
                    <span className="time">-{formatTime(Math.max(0, duration - progress))}</span>
                </div>
            </div>

            <div className="player-actions">
                <button className="btn-icon" onClick={handleDownload} title="Download Source">
                    <Download size={20} />
                </button>
                <Volume2 size={20} className="volume-icon" />
                <input
                    type="range"
                    className="volume-slider"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                />
            </div>
        </div>
    );
};

export default PlayerBar;
