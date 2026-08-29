import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Key,
  LogOut,
  RefreshCw,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  Database,
  Code2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { LocationRecord } from '../types';

interface AdminViewProps {
  onBackToShare: () => void;
  onOpenConfig?: () => void;
}

export function AdminView({ onBackToShare, onOpenConfig }: AdminViewProps) {
  const isConfigured = isSupabaseConfigured();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Auth form states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Data states
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Check auth session
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoadingUser(false);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  // Fetch locations function
  const fetchLocations = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;

    setLoadingData(true);
    setFetchError(null);

    try {
      const { data, error } = await client
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(error.message);
      } else {
        setLocations(data || []);
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to fetch location records.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (user) {
      fetchLocations();
    }
  }, [user, fetchLocations]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getSupabaseClient();
    if (!client) {
      setAuthError('Supabase is not configured. Please set the required credentials.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      if (authMode === 'signin') {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data?.user && !data.session) {
          setAuthSuccessMsg('Sign up successful! Please check your email for the confirmation link.');
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
      setUser(null);
      setLocations([]);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sqlSchemaText = `-- 1. Create table for shared locations
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow visitors (anon role) to INSERT their location only
CREATE POLICY "Allow anonymous inserts"
  ON public.locations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 4. Policy: Allow authenticated admin users to SELECT all location rows
CREATE POLICY "Allow authenticated select"
  ON public.locations
  FOR SELECT
  TO authenticated
  USING (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={onBackToShare}
          className="flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Share Page</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showSqlSchema ? 'Hide SQL Schema' : 'View SQL Schema'}</span>
          </button>
          {onOpenConfig && (
            <button
              onClick={onOpenConfig}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Config Keys</span>
            </button>
          )}
        </div>
      </div>

      {/* SQL Schema helper box */}
      {showSqlSchema && (
        <div className="mb-8 p-5 bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Database className="w-4 h-4" />
              <span>Supabase SQL Setup (Table & Row Level Security)</span>
            </div>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied SQL' : 'Copy SQL'}</span>
            </button>
          </div>
          <pre className="p-4 bg-stone-950 rounded-xl overflow-x-auto text-xs font-mono text-stone-300 leading-relaxed">
            {sqlSchemaText}
          </pre>
          <p className="mt-3 text-xs text-stone-400">
            Copy and run this in your Supabase project's <strong>SQL Editor</strong> to create the table and RLS policies.
          </p>
        </div>
      )}

      {/* Main content */}
      {!isConfigured ? (
        <div className="bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            Supabase Configuration Required
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
            To view stored locations and authenticate as an admin, provide your Supabase project URL and anon public key in your environment variables (<code className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>).
          </p>
          {onOpenConfig && (
            <button
              onClick={onOpenConfig}
              className="px-5 py-2.5 rounded-xl font-medium text-white bg-sky-600 hover:bg-sky-700 transition cursor-pointer"
            >
              Enter Supabase Keys
            </button>
          )}
        </div>
      ) : loadingUser ? (
        <div className="text-center py-16 text-stone-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
          <p className="text-sm">Checking authentication status...</p>
        </div>
      ) : !user ? (
        /* Login / Signup Card */
        <div className="max-w-md mx-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-xl shadow-stone-200/50 dark:shadow-none">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              {authMode === 'signin' ? 'Admin Login' : 'Create Admin Account'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {authMode === 'signin'
                ? 'Sign in with your Supabase authenticated account to view shared coordinates.'
                : 'Register a new admin user in your Supabase Auth project.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {authError}
              </div>
            )}

            {authSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
                {authSuccessMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 transition flex items-center justify-center gap-2 text-sm shadow-md shadow-sky-600/20 cursor-pointer"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : authMode === 'signin' ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              <span>{authLoading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className="text-xs text-stone-500 hover:text-sky-600 dark:hover:text-sky-400 transition"
              >
                {authMode === 'signin'
                  ? "Don't have an account yet? Create one"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Authenticated Admin Dashboard */
        <div className="space-y-6">
          {/* Top User Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                {user.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>{user.email}</span>
                  <span className="text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    Authenticated Admin
                  </span>
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  Select policy allows full viewing access
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLocations}
                disabled={loadingData}
                className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50 cursor-pointer"
                title="Refresh locations"
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Locations Table / List */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Shared Locations</span>
                  <span className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-full font-mono font-medium text-stone-600 dark:text-stone-400">
                    {locations.length} {locations.length === 1 ? 'entry' : 'entries'}
                  </span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Ordered by creation timestamp descending
                </p>
              </div>

              <div className="text-xs text-stone-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Auto-refreshed</span>
              </div>
            </div>

            {fetchError ? (
              <div className="p-6 text-center">
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                  <strong>Query Error:</strong> {fetchError}
                  <div className="mt-2 text-stone-600 dark:text-stone-400">
                    Ensure you have run the RLS policy <code className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">CREATE POLICY "Allow authenticated select"...</code> on your database.
                  </div>
                </div>
              </div>
            ) : loadingData && locations.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
                <p className="text-xs">Loading recorded locations from Supabase...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-700" />
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">No locations recorded yet</p>
                <p className="text-xs text-stone-400 mt-1">
                  Share a location from the main page to see entries listed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Latitude</th>
                      <th className="py-3 px-4">Longitude</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                    {locations.map((loc, idx) => {
                      const coordKey = loc.id || `loc-${idx}`;
                      const coordsText = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
                      return (
                        <tr
                          key={coordKey}
                          className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition"
                        >
                          <td className="py-3 px-4 font-sans text-stone-700 dark:text-stone-300 whitespace-nowrap">
                            {formatDate(loc.created_at)}
                          </td>
                          <td className="py-3 px-4 text-stone-900 dark:text-stone-100 font-semibold whitespace-nowrap">
                            {loc.lat.toFixed(6)}
                          </td>
                          <td className="py-3 px-4 text-stone-900 dark:text-stone-100 font-semibold whitespace-nowrap">
                            {loc.lng.toFixed(6)}
                          </td>
                          <td className="py-3 px-4 text-right font-sans whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCopy(coordKey, coordsText)}
                                className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 transition"
                                title="Copy Coordinates"
                              >
                                {copiedId === coordKey ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 transition flex items-center gap-1 text-[11px]"
                                title="Open in Maps"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
