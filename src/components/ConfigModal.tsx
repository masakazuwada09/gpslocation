import React, { useState, useEffect } from 'react';
import { X, Database, Check, Copy, KeyRound, Globe, RefreshCw } from 'lucide-react';
import { getSupabaseCredentials, getSupabaseClient } from '../lib/supabase';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setSaved(false);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      localStorage.setItem('supabase_custom_url', url.trim());
      localStorage.setItem('supabase_custom_key', anonKey.trim());
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
        window.location.reload();
      }, 800);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('supabase_custom_url');
    localStorage.removeItem('supabase_custom_key');
    setUrl('');
    setAnonKey('');
    window.location.reload();
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const client = getSupabaseClient();
      if (!client) {
        setTestResult({
          success: false,
          message: 'Client cannot be initialized. Make sure URL and Anon Key are filled in and saved.',
        });
        return;
      }

      // Try pinging table
      const { error } = await client.from('locations').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.message.includes('relation "public.locations" does not exist')) {
          setTestResult({
            success: false,
            message: 'Connected to Supabase project, but the "locations" table has not been created yet. Please execute the SQL migration.',
          });
        } else if (error.message.includes('permission denied') || error.code === '42501') {
          // If anon cannot select due to RLS, connection is actually working!
          setTestResult({
            success: true,
            message: 'Connected successfully! (RLS is active, protecting read access as expected).',
          });
        } else {
          setTestResult({
            success: false,
            message: `Connection error: ${error.message}`,
          });
        }
      } else {
        setTestResult({
          success: true,
          message: 'Connected successfully to Supabase "locations" table!',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100 text-base">
            <Database className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>Supabase Configuration</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          Configure your Supabase Project URL and Public Anon Key. You can also define these in your project's <code className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">.env</code> as <code className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Project URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Anon Public API Key
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900'
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-xl text-xs text-stone-500 hover:text-rose-600 transition cursor-pointer"
            >
              Reset to Defaults
            </button>
            <button
              onClick={testConnection}
              disabled={testing}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
              <span>Test Ping</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Saved!' : 'Save & Reload'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
