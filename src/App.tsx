import React, { useEffect, useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import BottomNav from './components/BottomNav';
import { MusicAPI } from './services/api';
import { usePlayer } from './context/usePlayer';
import { Play, Search as SearchIcon, Loader2, Plus, User as UserIcon, ArrowLeft } from 'lucide-react';
import type { Song, UserProfile, Playlist, Album, Chart } from './types';
import { StorageService } from './services/StorageService';
import { useTheme } from './context/useTheme';
import { useAuth } from './context/useAuth';
import SettingsView from './components/SettingsView';
import PlaylistManager from './components/PlaylistManager';
import PlaylistDetailView from './components/PlaylistDetailView';
import { App as CapApp } from '@capacitor/app';
import './App.css';
import './Search.css';

// Normalize a raw API song object (e.g. from /modules trending) into a valid Song type.
// The trending endpoint returns primaryArtists as an array of objects and omits downloadUrl.
const normalizeSong = (raw: any): Song => ({
  ...raw,
  primaryArtists: Array.isArray(raw.primaryArtists)
    ? raw.primaryArtists.map((a: any) => a.name || '').filter(Boolean).join(', ') || 'Unknown Artist'
    : (typeof raw.primaryArtists === 'string' ? raw.primaryArtists : 'Unknown Artist'),
  image: Array.isArray(raw.image) ? raw.image : [],
  downloadUrl: Array.isArray(raw.downloadUrl) ? raw.downloadUrl : [],
});

function App() {
  const { playSong } = usePlayer();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [trending, setTrending] = useState<Song[]>([]);
  const [newAlbums, setNewAlbums] = useState<Album[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const [topCharts, setTopCharts] = useState<Chart[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'playlist' | 'settings' | 'my-playlists' | 'playlist-detail'>('home');
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => StorageService.getProfile());
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() => StorageService.getPlaylists());
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const searchTimeout = useRef<number | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // --- GLOBAL AUDIO UNLOCKER ---
    // Mobile browsers block audio until a synchronous play() call is made on a user gesture.
    const unlockAudio = () => {
      const audio = document.getElementById('uk-beats-audio') as HTMLAudioElement;
      if (audio) {
        // Play and immediately pause to "unlock" the element for future async play() calls
        audio.play().then(() => audio.pause()).catch(() => { });
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('click', unlockAudio);
      }
    };
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('click', unlockAudio);

    // Fetch initial trending data and other modules
    MusicAPI.getTrending().then((res: any) => {
      if (res?.status === 'SUCCESS' && res.data) {
        if (Array.isArray(res.data.trending?.songs)) setTrending(res.data.trending.songs.map(normalizeSong));
        if (Array.isArray(res.data.albums)) setNewAlbums(res.data.albums);
        if (Array.isArray(res.data.playlists)) setFeaturedPlaylists(res.data.playlists);
        if (Array.isArray(res.data.charts)) setTopCharts(res.data.charts);
      }
    }).catch(err => {
      console.error("Dashboard data load failed:", err);
    });

    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  // Fetch from Supabase Cloud on Login / App Load
  useEffect(() => {
    if (user) {
      StorageService.fetchProfileFromCloud(user.id).then(profile => {
        if (profile) {
          setCurrentUser(profile);
          StorageService.saveProfile(profile);
        }
      });
      StorageService.fetchPlaylistsFromCloud(user.id).then(playlists => {
        if (playlists && playlists.length > 0) {
          setCustomPlaylists(playlists);
          // Overwrite local with cloud
          playlists.forEach(p => StorageService.savePlaylist(p));
        }
      });
    }
  }, [user]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSearchPage(1);
    setHasMoreSearch(false);

    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);

    if (query.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = window.setTimeout(() => {
      MusicAPI.searchSongs(query, 1, 20)
        .then(res => {
          if (res.status === 'SUCCESS' && res.data.results) {
            setSearchResults(res.data.results);
            setHasMoreSearch(res.data.results.length === 20);
          }
        })
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 500); // 500ms debounce
  };

  // --- NATIVE BACK BUTTON HANDLER (Capacitor) ---
  useEffect(() => {
    const handleBackButton = async () => {
      // If we are not on Home, navigate to Home
      if (currentView !== 'home') {
        setCurrentView('home');
        setSearchQuery('');
        return;
      }
      // If we ARE on Home, we can decide to minimize or do nothing.
      // Usually, we want to prevent closure while music plays.
    };

    const listener = CapApp.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [currentView]);

  // --- PERSISTENT HISTORY GUARD (Legacy PWA Support) ---
  useEffect(() => {
    if (!window.history.state || (window.history.state.type !== 'guardian' && window.history.state.type !== 'base')) {
      window.history.replaceState({ type: 'base' }, '');
      window.history.pushState({ type: 'guardian' }, '');
    }
    const handlePopState = (event: PopStateEvent) => {
      if (!event.state || event.state.type === 'base') {
        if (currentView !== 'home') {
          setCurrentView('home');
          setSearchQuery('');
        }
        window.history.pushState({ type: 'guardian' }, '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);
  // ----------------------------------------

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreSearch && !isSearching && searchQuery.trim() !== '') {
          loadMoreSearch();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMoreSearch, isSearching, searchQuery, searchPage]);

  const loadMoreSearch = () => {
    setIsSearching(true);
    const nextPage = searchPage + 1;
    MusicAPI.searchSongs(searchQuery, nextPage, 20)
      .then(res => {
        if (res.status === 'SUCCESS' && res.data.results) {
          setSearchResults(prev => [...prev, ...res.data.results]);
          setSearchPage(nextPage);
          setHasMoreSearch(res.data.results.length === 20);
        }
      })
      .catch(console.error)
      .finally(() => setIsSearching(false));
  };


  const renderTrackCard = (song: Song, contextQueue: Song[], isSearchResult = false) => {
    if (!song) return null;

    const handleSongClick = async () => {
      // If the song has no downloadUrl (e.g. from trending endpoint), fetch full details first
      if (!song.downloadUrl || song.downloadUrl.length === 0) {
        try {
          const res = await MusicAPI.getSongById(song.id);
          if (res?.status === 'SUCCESS' && res.data && res.data.length > 0) {
            const fullSong = normalizeSong(res.data[0]);
            const updatedQueue = contextQueue.map(s => s.id === song.id ? fullSong : s);
            if (isSearchResult && searchQuery) {
              playSong(fullSong, updatedQueue, { query: searchQuery, page: searchPage });
            } else {
              playSong(fullSong, updatedQueue);
            }
            return;
          }
        } catch (err) {
          console.error('Failed to fetch full song details:', err);
        }
      }
      // Song already has downloadUrl, play directly
      if (isSearchResult && searchQuery) {
        playSong(song, contextQueue, { query: searchQuery, page: searchPage });
      } else {
        playSong(song, contextQueue);
      }
    };

    return (
      <div key={`track-${song.id}-${isSearchResult ? 'search' : 'dash'}`} className="track-card hover-lift" onClick={handleSongClick}>
        <div className="card-img-wrapper">
          <img src={Array.isArray(song.image) ? (song.image[song.image.length - 1]?.link || '') : ''} alt={song.name || 'Song'} onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300?text=No+Image')} />
          <div className="play-overlay">
            <Play size={24} fill="currentColor" />
          </div>
          <button
            className="add-to-playlist-btn"
            onClick={(e) => {
              e.stopPropagation();
              setTrackToPlaylist(song);
            }}
            title="Add to Playlist"
          >
            <Plus size={18} />
          </button>
        </div>
        <h4 title={typeof song.name === 'string' ? song.name : ''} dangerouslySetInnerHTML={{ __html: typeof song.name === 'string' ? song.name : '' }}></h4>
        <p title={typeof song?.primaryArtists === 'string' ? song.primaryArtists : ''}>
          {typeof song?.primaryArtists === 'string' ? song.primaryArtists : 'Unknown Artist'}
        </p>
      </div>
    );
  };

  const renderAlbumCard = (album: Album) => {
    if (!album) return null;
    const artistName = typeof album.artist === 'string' ? album.artist :
      (Array.isArray(album.artist) ? (album.artist as any)[0]?.name : '');

    return (
      <div key={album.id} className="track-card album-card hover-lift" onClick={() => loadPlaylist(album.id, album.name)}>
        <div className="card-img-wrapper">
          <img src={Array.isArray(album.image) ? (album.image[album.image.length - 1]?.link || '') : ''} alt={album.name || 'Album'} />
          <div className="play-overlay">
            <Play size={24} fill="currentColor" />
          </div>
        </div>
        <h4 title={typeof album.name === 'string' ? album.name : ''} dangerouslySetInnerHTML={{ __html: typeof album.name === 'string' ? album.name : '' }}></h4>
        <p>{artistName || album.language || 'Album'}</p>
      </div>
    );
  };

  const renderChartCard = (chart: Chart) => {
    if (!chart) return null;
    return (
      <div key={chart.id} className="track-card chart-card hover-lift" onClick={() => loadPlaylist(chart.id, chart.name)}>
        <div className="card-img-wrapper">
          <img src={Array.isArray(chart.image) ? (chart.image[chart.image.length - 1]?.link || '') : ''} alt={chart.name || 'Chart'} />
          <div className="play-overlay">
            <Play size={24} fill="currentColor" />
          </div>
        </div>
        <h4 title={typeof chart.name === 'string' ? chart.name : ''} dangerouslySetInnerHTML={{ __html: typeof chart.name === 'string' ? chart.name : '' }}></h4>
        <p>{(typeof chart.firstname === 'string' ? chart.firstname : '') || 'Top Chart'}</p>
      </div>
    );
  };

  const [trackToPlaylist, setTrackToPlaylist] = useState<Song | null>(null);

  useEffect(() => {
    const handleAddToPlaylistEvent = (e: any) => {
      setTrackToPlaylist(e.detail);
    };
    window.addEventListener('add-to-playlist', handleAddToPlaylistEvent);

    const handlePlaylistsUpdated = () => {
      setCustomPlaylists(StorageService.getPlaylists());
    };
    window.addEventListener('playlists-updated', handlePlaylistsUpdated);

    return () => {
      window.removeEventListener('add-to-playlist', handleAddToPlaylistEvent);
      window.removeEventListener('playlists-updated', handlePlaylistsUpdated);
    };
  }, []);

  const handleAddToPlaylist = async (playlistId: string) => {
    if (trackToPlaylist) {
      StorageService.addSongToPlaylist(playlistId, trackToPlaylist);
      setTrackToPlaylist(null);
      const updatedPlaylists = StorageService.getPlaylists();
      setCustomPlaylists(updatedPlaylists);
      if (user) {
        await StorageService.syncPlaylistsToCloud(user.id, updatedPlaylists);
      }
      alert('Added to playlist!');
    }
  };

  const loadPlaylist = (id: string, title: string) => {
    setSearchQuery('');
    setCurrentView('playlist');
    setPlaylistTitle(title);
    setIsLoadingPlaylist(true);
    MusicAPI.getPlaylist(id).then(res => {
      if (res.status === 'SUCCESS' && res.data.songs) {
        setPlaylistSongs(res.data.songs);
      }
    }).catch(console.error).finally(() => setIsLoadingPlaylist(false));
  };

  return (
    <div className={`app-container ${theme}-theme`}>
      <Sidebar
        onLogoClick={() => {
          const newTaps = logoTaps + 1;
          setLogoTaps(newTaps);
          if (newTaps >= 5) {
            setShowDebug(true);
            setLogoTaps(0);
          }
        }}
        onNavigate={(view, playlistId, title) => {
          if (view === 'home') {
            setSearchQuery('');
            setCurrentView('home');
          } else if (view === 'search') {
            document.querySelector<HTMLInputElement>('.search-bar input')?.focus();
          } else if (view === 'playlist' && playlistId) {
            loadPlaylist(playlistId, title || 'Playlist');
          } else if (view === 'settings') {
            setSearchQuery('');
            setCurrentView('settings');
          } else if (view === 'my-playlists') {
            setSearchQuery('');
            setCurrentView('my-playlists');
            setCustomPlaylists(StorageService.getPlaylists());
          }
        }}
      />
      <main className="main-content">
        <header className="topbar">
          <div className="search-bar">
            <SearchIcon size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search for songs, artists, playlists..."
              value={searchQuery}
              onChange={handleSearch}
            />
            {isSearching && <Loader2 size={20} className="spinner" />}
          </div>
          <div className="profile-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '4px 12px', background: 'var(--glass-bg)', borderRadius: '24px', border: '1px solid var(--glass-border)' }} onClick={() => setCurrentView('settings')}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{currentUser?.name || 'User'}</span>
            <div className="profile-placeholder" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', borderRadius: '50%', overflow: 'hidden' }}>
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <UserIcon size={18} />
              )}
            </div>
          </div>
        </header>

        {showDebug && (
          <div className="debug-overlay glass-panel" style={{
            position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
            padding: '16px', fontSize: '12px', color: '#fff',
            maxHeight: '70vh', overflowY: 'auto', width: '280px',
            border: '2px solid var(--accent-primary)', boxShadow: '0 0 20px rgba(0,0,0,0.5)'
          }}>
            <h4 style={{ margin: '0 0 10px 0', display: 'flex', justifyContent: 'space-between' }}>
              Debug Logs <button onClick={() => setShowDebug(false)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>Close</button>
            </h4>
            <div id="debug-log-content">
              <p><strong>Device:</strong> {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</p>
              <p><strong>URL:</strong> {window.location.href}</p>
              <p><strong>History State:</strong> {JSON.stringify(window.history.state)}</p>
              <p><strong>View:</strong> {currentView}</p>
              <hr />
              <div id="audio-debug-info">
                {/* Dynamically updated by PlayerContext */}
                <p>Loading audio state...</p>
              </div>
            </div>
          </div>
        )}

        {searchQuery.trim() !== '' ? (
          <section className="search-view">
            <div className="section-header">
              <h3>Search Results for "{searchQuery}"</h3>
            </div>
            {searchResults.length > 0 ? (
              <>
                <div className="card-grid">
                  {searchResults.map((song, idx) => (
                    <React.Fragment key={`${song.id}-${idx}`}>
                      {renderTrackCard(song, searchResults, true)}
                    </React.Fragment>
                  ))}
                </div>
                {hasMoreSearch && (
                  <div ref={observerTarget} className="loading-more" style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <Loader2 size={24} className="spinner" />
                  </div>
                )}
              </>
            ) : (
              !isSearching && <p className="no-results">No songs found. Try a different search.</p>
            )}
          </section>
        ) : currentView === 'playlist' ? (
          <section className="playlist-view">
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn-icon hover-lift" onClick={() => setCurrentView('home')}><ArrowLeft size={24} /></button>
              <h3 style={{ margin: 0 }}>{playlistTitle}</h3>
              {isLoadingPlaylist && <Loader2 size={20} className="spinner" />}
            </div>
            {!isLoadingPlaylist && playlistSongs.length > 0 ? (
              <div className="card-grid">
                {playlistSongs.map(song => renderTrackCard(song, playlistSongs))}
              </div>
            ) : (
              !isLoadingPlaylist && <p className="no-results">No songs found in this playlist.</p>
            )}
          </section>
        ) : currentView === 'settings' ? (
          <SettingsView profile={currentUser} onUpdate={(p) => setCurrentUser(p)} />
        ) : currentView === 'my-playlists' ? (
          <PlaylistManager
            playlists={customPlaylists}
            onSelect={(playlist: Playlist) => {
              setSelectedPlaylist(playlist);
              setCurrentView('playlist-detail');
            }}
            onCreate={() => setCustomPlaylists(StorageService.getPlaylists())}
          />
        ) : currentView === 'playlist-detail' && selectedPlaylist ? (
          <PlaylistDetailView
            playlist={selectedPlaylist}
            onPlayAll={() => playSong(selectedPlaylist.songs[0], selectedPlaylist.songs)}
            onBack={() => setCurrentView('my-playlists')}
          />
        ) : (
          <section className="dashboard">
            <div className="hero-banner hover-lift">
              <div className="hero-content">
                <h2>Trending Now</h2>
                <p>Discover the most played tracks today.</p>
                <button className="btn-primary" onClick={() => loadPlaylist('110858205', 'Trending Top 50')}>Listen Now</button>
              </div>
            </div>

            {/* Trending Songs */}
            <div className="section-header">
              <h3>Fast & Furious: Trending Songs</h3>
              <span className="see-all hover-lift" onClick={() => loadPlaylist('110858205', 'Trending Top 50')}>See All</span>
            </div>
            <div className="card-grid">
              {(Array.isArray(trending) ? trending : []).slice(0, 5).map((song) => renderTrackCard(song, trending))}
            </div>

            {/* New Albums */}
            {newAlbums.length > 0 && (
              <>
                <div className="section-header mt-40">
                  <h3>New Releases & Top Albums</h3>
                </div>
                <div className="card-grid">
                  {(Array.isArray(newAlbums) ? newAlbums : []).slice(0, 5).map((album) => renderAlbumCard(album))}
                </div>
              </>
            )}

            {/* Top Charts */}
            {topCharts.length > 0 && (
              <>
                <div className="section-header mt-40">
                  <h3>Global Top Charts</h3>
                </div>
                <div className="card-grid">
                  {topCharts.slice(0, 5).map((chart) => renderChartCard(chart))}
                </div>
              </>
            )}

            {/* Featured Playlists */}
            {featuredPlaylists.length > 0 && (
              <>
                <div className="section-header mt-40">
                  <h3>Editor's Choice: Featured Playlists</h3>
                </div>
                <div className="card-grid">
                  {(Array.isArray(featuredPlaylists) ? featuredPlaylists : []).slice(0, 5).map((p) => renderChartCard(p as Chart))}
                </div>
              </>
            )}
          </section>
        )}

        {trackToPlaylist && (
          <div className="modal-overlay" onClick={() => setTrackToPlaylist(null)}>
            <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
              <h3>Add to Playlist</h3>
              <p>Choose a playlist for "{trackToPlaylist.name}"</p>
              <div className="playlist-selection-list">
                {customPlaylists.map(p => (
                  <div key={p.id} className="playlist-selection-item hover-lift" onClick={() => handleAddToPlaylist(p.id)}>
                    <Plus size={16} /> {p.name}
                  </div>
                ))}
                {customPlaylists.length === 0 && (
                  <p className="no-playlists-msg">You haven't created any playlists yet. Go to "My Playlists" to create one!</p>
                )}
              </div>
              <button className="btn-secondary" onClick={() => setTrackToPlaylist(null)}>Close</button>
            </div>
          </div>
        )}
      </main>
      <BottomNav
        onNavigate={(view, playlistId, title) => {
          if (view === 'home') { setSearchQuery(''); setCurrentView('home'); }
          else if (view === 'search') { document.querySelector<HTMLInputElement>('.search-bar input')?.focus(); }
          else if (view === 'my-playlists') { setSearchQuery(''); setCurrentView('my-playlists'); setCustomPlaylists(StorageService.getPlaylists()); }
          else if (view === 'settings') { setSearchQuery(''); setCurrentView('settings'); }
          else if (view === 'playlist' && playlistId) { loadPlaylist(playlistId, title || 'Playlist'); }
        }}
        currentView={currentView}
        hasSearch={searchQuery.trim() !== ''}
      />
      <PlayerBar />
    </div >
  );
}

export default App;
