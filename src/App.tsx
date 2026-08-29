import React, { useState, useEffect } from 'react';
import { ShareLocationCard } from './components/ShareLocationCard';
import { AdminView } from './components/AdminView';
import { ConfigModal } from './components/ConfigModal';
import { Database, Shield, Globe } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const [currentView, setCurrentView] = useState<'share' | 'admin'>('share');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const isConfigured = isSupabaseConfigured();

  // Sync with browser hash routing (#admin / #share or /admin)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('admin') || window.location.pathname === '/admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('share');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToAdmin = () => {
    window.location.hash = 'admin';
    setCurrentView('admin');
  };

  const navigateToShare = () => {
    window.location.hash = '';
    setCurrentView('share');
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between selection:bg-sky-500/20 selection:text-sky-800 dark:selection:text-sky-200 font-sans antialiased">
      {/* Top Navigation / Status Header */}
      <header className="w-full border-b border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/70 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3 transition-colors">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div
            onClick={navigateToShare}
            className="flex items-center gap-2.5 font-bold tracking-tight text-stone-800 dark:text-stone-200 cursor-pointer text-sm sm:text-base select-none"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Globe className="w-4 h-4" />
            </div>
            <span>Share Location</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition cursor-pointer"
              title="Supabase configuration status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden sm:inline">
                {isConfigured ? 'Supabase Connected' : 'Supabase Setup'}
              </span>
              <Database className="w-3.5 h-3.5" />
            </button>

            {/* View Switcher Button */}
            {currentView === 'share' ? (
              <button
                id="nav-admin-btn"
                onClick={navigateToAdmin}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            ) : (
              <button
                id="nav-share-btn"
                onClick={navigateToShare}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Share View</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        {currentView === 'share' ? (
          <ShareLocationCard
            onOpenConfig={() => setIsConfigOpen(true)}
            onNavigateToAdmin={navigateToAdmin}
          />
        ) : (
          <AdminView
            onBackToShare={navigateToShare}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-stone-400 dark:text-stone-600 border-t border-stone-200/60 dark:border-stone-800/60">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Browser Geolocation API + Supabase PostgreSQL</span>
          <span>Anonymous Insert &bull; Authenticated Admin Select</span>
        </div>
      </footer>

      {/* Config & SQL modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
