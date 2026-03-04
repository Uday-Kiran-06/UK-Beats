import React, { useState, useRef } from 'react';
import { User, Save, Settings as SettingsIcon, LogIn, Mail, LogOut, UserPlus, Shield, Bell, Palette, Globe, Smartphone } from 'lucide-react';
import type { UserProfile } from '../types';
import { StorageService } from '../services/StorageService';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/useTheme';

interface SettingsViewProps {
    profile: UserProfile | null;
    onUpdate: (profile: UserProfile) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ profile, onUpdate }) => {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [name, setName] = useState(profile?.name || user?.user_metadata?.full_name || '');
    const [loginMode, setLoginMode] = useState<'login' | 'profile'>('profile');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string>(
        profile?.avatar || user?.user_metadata?.avatar_url || ''
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setAvatarPreview(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = () => {
        const updatedProfile: UserProfile = {
            id: profile?.id || user?.id || Date.now().toString(),
            name: name || 'User',
            avatar: avatarPreview || profile?.avatar || user?.user_metadata?.avatar_url || '',
            joinDate: profile?.joinDate || user?.created_at || new Date().toLocaleDateString(),
            stats: profile?.stats || { playlists: 0, songs: 0 }
        };
        StorageService.saveProfile(updatedProfile);
        onUpdate(updatedProfile);
        // Optional: Update user metadata in Supabase
        if (user) {
            supabase.auth.updateUser({ data: { full_name: name } });
        }
        alert('Profile updated!');
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: name || 'User' } }
                });
                if (error) throw error;
                alert('Verification email sent!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) alert(error.message);
    };

    return (
        <div className="settings-view">
            <header className="settings-header">
                <div className="flex items-center gap-12">
                    <SettingsIcon size={28} className="text-secondary" />
                    <div>
                        <h2>Settings</h2>
                        <p className="text-secondary text-sm">Manage your account, profile, and app preferences.</p>
                    </div>
                </div>
            </header>

            <div className="settings-layout">
                <nav className="settings-nav glass-panel">
                    <button
                        className={`settings-nav-item ${loginMode === 'profile' ? 'active' : ''}`}
                        onClick={() => setLoginMode('profile')}
                    >
                        <User size={18} />
                        <span>Public Profile</span>
                    </button>
                    <button
                        className={`settings-nav-item ${loginMode === 'login' ? 'active' : ''}`}
                        onClick={() => setLoginMode('login')}
                    >
                        <Shield size={18} />
                        <span>Account & Security</span>
                    </button>
                    <div className="nav-divider"></div>
                    <button className="settings-nav-item disabled">
                        <Bell size={18} />
                        <span>Notifications</span>
                    </button>
                    <button className="settings-nav-item">
                        <Palette size={18} />
                        <span>Appearance</span>
                    </button>
                    <button className="settings-nav-item disabled">
                        <Globe size={18} />
                        <span>Language</span>
                    </button>
                </nav>

                <main className="settings-main-content">
                    {loginMode === 'profile' ? (
                        <section className="settings-section glass-panel">
                            <div className="section-title">
                                <h4>Public Profile</h4>
                                <p>This information will be displayed publicly.</p>
                            </div>

                            <div className="profile-edit-grid">
                                <div className="avatar-upload">
                                    <div className="profile-avatar-large" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Profile" />
                                        ) : (
                                            <User size={48} />
                                        )}
                                    </div>
                                    {/* Hidden file picker */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleAvatarChange}
                                    />
                                    <button className="btn-secondary small" onClick={() => fileInputRef.current?.click()}>Change Avatar</button>
                                </div>

                                <div className="profile-form">
                                    <div className="input-group">
                                        <label>Display Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter your name"
                                            className="settings-input"
                                        />
                                        <p className="input-hint">Your name will be visible to other listeners.</p>
                                    </div>

                                    <div className="info-row">
                                        <span className="label">Member Since</span>
                                        <span className="value">
                                            {profile?.joinDate || user?.created_at
                                                ? new Date(profile?.joinDate || user?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                                : 'Today'}
                                        </span>
                                    </div>

                                    <div className="form-actions">
                                        <button className="btn-primary" onClick={handleSaveProfile}>
                                            <Save size={18} /> Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="settings-section glass-panel">
                            <div className="section-title">
                                <h4>Account Security</h4>
                                <p>Manage your login methods and security settings.</p>
                            </div>

                            {user ? (
                                <div className="account-card">
                                    <div className="account-info">
                                        <div className="info-item">
                                            <label>Email Address</label>
                                            <div className="info-flex">
                                                <Mail size={16} className="text-secondary" />
                                                <span>{user.email}</span>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <label>Authentication Provider</label>
                                            <div className="info-flex">
                                                {user.app_metadata.provider === 'google' ? <Globe size={16} className="text-secondary" /> : <Mail size={16} className="text-secondary" />}
                                                <span className="capitalize">{user.app_metadata.provider || 'Email'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="account-actions">
                                        <button className="btn-danger" onClick={signOut}>
                                            <LogOut size={18} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="auth-container">
                                    <div className="social-auth">
                                        <button className="btn-google hover-lift" onClick={handleGoogleLogin}>
                                            <Mail size={20} />
                                            <span>Continue with Google</span>
                                        </button>
                                    </div>

                                    <div className="auth-divider">
                                        <span>or continue with email</span>
                                    </div>

                                    <form className="auth-form" onSubmit={handleEmailAuth}>
                                        <div className="input-group">
                                            <input
                                                type="email"
                                                placeholder="Email Address"
                                                className="settings-input"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="input-group">
                                            <input
                                                type="password"
                                                placeholder="Password"
                                                className="settings-input"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <button className="btn-primary full-width" type="submit" disabled={loading}>
                                            {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                                            {loading ? ' Processing...' : (isSignUp ? ' Create Account' : ' Sign In')}
                                        </button>
                                    </form>

                                    <p className="auth-footer">
                                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                                        <button className="link-btn" onClick={() => setIsSignUp(!isSignUp)}>
                                            {isSignUp ? 'Sign In' : 'Create one'}
                                        </button>
                                    </p>
                                </div>
                            )}
                        </section>
                    )}

                    <section className="settings-section glass-panel mt-24">
                        <div className="section-title">
                            <h4>App Preferences</h4>
                            <p>Customize your listening experience.</p>
                        </div>

                        <div className="preferences-grid">
                            <div className="pref-item">
                                <div className="pref-info">
                                    <Smartphone size={18} className="text-secondary" />
                                    <div>
                                        <span>Audio Quality</span>
                                        <p className="pref-hint">Higher quality uses more data.</p>
                                    </div>
                                </div>
                                <select className="settings-select">
                                    <option>High (320kbps)</option>
                                    <option>Medium (160kbps)</option>
                                    <option>Low (96kbps)</option>
                                </select>
                            </div>

                            <div className="pref-item">
                                <div className="pref-info">
                                    <Palette size={18} className="text-secondary" />
                                    <div>
                                        <span>Color Theme</span>
                                        <p className="pref-hint">Switch between light and dark.</p>
                                    </div>
                                </div>
                                <div
                                    className={`toggle-switch ${theme === 'light' ? 'active' : ''}`}
                                    onClick={toggleTheme}
                                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                                ></div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default SettingsView;
