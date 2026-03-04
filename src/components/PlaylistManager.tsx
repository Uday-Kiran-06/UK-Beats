import React, { useState } from 'react';
import { Plus, ListMusic, Trash2 } from 'lucide-react';
import type { Playlist } from '../types';
import { StorageService } from '../services/StorageService';

interface PlaylistManagerProps {
    playlists: Playlist[];
    onSelect: (playlist: Playlist) => void;
    onCreate: () => void;
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({ playlists, onSelect, onCreate }) => {
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = () => {
        if (!newPlaylistName.trim()) return;
        const newPlaylist: Playlist = {
            id: Date.now().toString(),
            name: newPlaylistName,
            songs: [],
            createdAt: new Date().toLocaleDateString()
        };
        StorageService.savePlaylist(newPlaylist);
        setNewPlaylistName('');
        setIsCreating(false);
        onCreate();
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this playlist?')) {
            StorageService.deletePlaylist(id);
            onCreate(); // Refresh list
        }
    };

    return (
        <div className="playlist-manager">
            <div className="section-header">
                <h3>My Playlists</h3>
                <button className="btn-primary" onClick={() => setIsCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Create Playlist
                </button>
            </div>

            {isCreating && (
                <div className="modal-overlay" onClick={() => setIsCreating(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 700 }}>Name your playlist</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                            Give your new playlist a catchy name.
                        </p>

                        <input
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="My awesome playlist"
                            className="settings-input"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') setIsCreating(false);
                            }}
                            style={{ marginBottom: '24px' }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn-secondary" onClick={() => setIsCreating(false)} style={{ padding: '10px 20px', borderRadius: '24px', fontWeight: 600 }}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={handleCreate} disabled={!newPlaylistName.trim()}>
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="playlist-grid">
                {playlists.length > 0 ? (
                    playlists.map(playlist => (
                        <div key={playlist.id} className="playlist-card hover-lift" onClick={() => onSelect(playlist)}>
                            <div className="playlist-icon-wrapper">
                                <ListMusic size={48} />
                                <span className="song-count">{playlist.songs.length} songs</span>
                            </div>
                            <div className="playlist-card-info">
                                <h4>{playlist.name}</h4>
                                <button className="btn-delete" onClick={(e) => handleDelete(e, playlist.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px 20px', color: 'var(--text-secondary)' }}>
                        <ListMusic size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No playlists yet. Create one to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistManager;
