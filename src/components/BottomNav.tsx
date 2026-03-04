import { Home, Search, Library, Settings } from 'lucide-react';

interface BottomNavProps {
    onNavigate: (view: string, playlistId?: string, title?: string) => void;
    currentView: string;
    hasSearch: boolean;
}

export default function BottomNav({ onNavigate, currentView, hasSearch }: BottomNavProps) {
    const items = [
        { icon: Home, label: 'Home', view: 'home' },
        { icon: Search, label: 'Search', view: 'search' },
        { icon: Library, label: 'Library', view: 'my-playlists' },
        { icon: Settings, label: 'Settings', view: 'settings' },
    ];

    const activeView = hasSearch ? 'search' : currentView;

    return (
        <nav className="bottom-nav glass-panel">
            {items.map(({ icon: Icon, label, view }) => (
                <button
                    key={view}
                    className={`bottom-nav-item ${activeView === view ? 'active' : ''}`}
                    onClick={() => onNavigate(view)}
                >
                    <Icon size={22} />
                    <span>{label}</span>
                </button>
            ))}
        </nav>
    );
}
