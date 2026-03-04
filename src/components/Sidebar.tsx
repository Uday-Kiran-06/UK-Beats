import { Home, Search, Library, PlayCircle, Settings } from 'lucide-react';

export default function Sidebar({ onNavigate, onLogoClick }: {
    onNavigate: (view: string, playlistId?: string, title?: string) => void,
    onLogoClick?: () => void
}) {
    return (
        <aside className="sidebar glass-panel">
            <div className="logo-container" onClick={onLogoClick} style={{ cursor: 'pointer' }}>
                <PlayCircle size={32} color="var(--accent-primary)" />
                <h1 className="text-gradient">UK-Beats</h1>
            </div>

            <nav className="nav-menu">
                <div className="nav-section">
                    <p className="nav-title">Menu</p>
                    <a href="#" className="nav-item active" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>
                        <Home size={20} />
                        <span>Home</span>
                    </a>
                    <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); onNavigate('search'); }}>
                        <Search size={20} />
                        <span>Search</span>
                    </a>
                    <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); onNavigate('my-playlists'); }}>
                        <Library size={20} />
                        <span>My Playlists</span>
                    </a>
                </div>

                <div className="nav-section">
                    <p className="nav-title">Playlists</p>
                    <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); onNavigate('playlist', '110858205', 'Trending Top 50'); }}>
                        <span>Trending Top 50</span>
                    </a>
                    <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); onNavigate('playlist', '48189087', 'English Viral Hits'); }}>
                        <span>English Viral Hits</span>
                    </a>
                    <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); onNavigate('playlist', '902306817', 'Viral Pop'); }}>
                        <span>Viral Pop</span>
                    </a>
                </div>
            </nav>

            <div className="settings-btn" onClick={() => onNavigate('settings')}>
                <Settings size={20} />
                <span>Settings</span>
            </div>
        </aside>
    );
}
