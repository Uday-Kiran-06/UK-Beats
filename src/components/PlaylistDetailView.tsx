import { Play, Music, Clock, ArrowLeft } from 'lucide-react';
import type { Playlist } from '../types';
import { usePlayer } from '../context/usePlayer';

interface PlaylistDetailViewProps {
    playlist: Playlist;
    onPlayAll: () => void;
    onBack?: () => void;
}

const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ playlist, onPlayAll, onBack }) => {
    const { playSong } = usePlayer();

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="playlist-detail-view">
            {onBack && (
                <button className="btn-icon hover-lift" onClick={onBack} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                    <ArrowLeft size={24} /> Back
                </button>
            )}
            <div className="playlist-detail-header glass-panel">
                <div className="playlist-artwork">
                    {playlist.songs.length > 0 ? (
                        <img src={playlist.songs[0].image[playlist.songs[0].image.length - 1].link} alt={playlist.name} />
                    ) : (
                        <div className="playlist-placeholder">
                            <Music size={64} />
                        </div>
                    )}
                </div>
                <div className="playlist-detail-info">
                    <p className="playlist-type">Playlist</p>
                    <h2 className="playlist-title">{playlist.name}</h2>
                    <p className="playlist-meta">
                        {playlist.songs.length} songs • Created on {playlist.createdAt}
                    </p>
                    <div className="playlist-actions">
                        <button className="btn-primary" onClick={onPlayAll} disabled={playlist.songs.length === 0}>
                            <Play size={18} fill="currentColor" /> Play All
                        </button>
                    </div>
                </div>
            </div>

            <div className="song-list-container">
                <div className="song-list-header">
                    <div className="col-idx">#</div>
                    <div className="col-title">Title</div>
                    <div className="col-album">Album</div>
                    <div className="col-duration">
                        <Clock size={16} />
                    </div>
                </div>

                {playlist.songs.length > 0 ? (
                    playlist.songs.map((song, index) => (
                        <div key={song.id} className="song-row hover-lift" onClick={() => playSong(song, playlist.songs)}>
                            <div className="col-idx">{index + 1}</div>
                            <div className="col-title">
                                <img src={song.image[0].link} alt={song.name} className="song-thumb" />
                                <div className="song-info">
                                    <div className="song-name" dangerouslySetInnerHTML={{ __html: song.name }}></div>
                                    <div className="song-artist" title={song.primaryArtists || ''}>{song.primaryArtists}</div>
                                </div>
                            </div>
                            <div className="col-album" dangerouslySetInnerHTML={{ __html: song.album.name }}></div>
                            <div className="col-duration">{formatDuration(song.duration)}</div>
                        </div>
                    ))
                ) : (
                    <p className="no-songs-msg">This playlist is empty. Add some songs from search results!</p>
                )}
            </div>
        </div>
    );
};

export default PlaylistDetailView;
