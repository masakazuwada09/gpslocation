import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Lock,
  Compass,
} from 'lucide-react';
import { insertLocation, isSupabaseConfigured } from '../lib/supabase';
import { LocationState, NativePermissionState } from '../types';

interface ShareLocationCardProps {
  onOpenConfig?: () => void;
  onNavigateToAdmin?: () => void;
}

export function ShareLocationCard({ onOpenConfig, onNavigateToAdmin }: ShareLocationCardProps) {
  const [state, setState] = useState<LocationState>({
    status: 'idle',
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    errorMessage: null,
    permissionState: 'unknown',
  });

  const [copied, setCopied] = useState(false);
  const isConfigured = isSupabaseConfigured();
  const hasTriggeredInitialRef = useRef(false);

  // Request location using native browser Geolocation API
  const requestNativeLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      status: 'requesting',
      errorMessage: null,
    }));

    // Trigger the native browser/OS permission & location query
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const timestamp = position.timestamp;

        setState((prev) => ({
          ...prev,
          status: 'saving',
          latitude: lat,
          longitude: lng,
          accuracy,
          timestamp,
          errorMessage: null,
          permissionState: 'granted',
        }));

        // Insert into Supabase table "locations"
        if (isConfigured) {
          const result = await insertLocation(lat, lng);
          if (result.success) {
            setState((prev) => ({
              ...prev,
              status: 'success',
              latitude: lat,
              longitude: lng,
              accuracy,
              timestamp,
              errorMessage: null,
              permissionState: 'granted',
            }));
          } else {
            setState((prev) => ({
              ...prev,
              status: 'error',
              latitude: lat,
              longitude: lng,
              accuracy,
              timestamp,
              errorMessage: result.error || 'Failed to save coordinates to database.',
              permissionState: 'granted',
            }));
          }
        } else {
          // If Supabase keys are not set, record coordinates locally
          setState((prev) => ({
            ...prev,
            status: 'success',
            latitude: lat,
            longitude: lng,
            accuracy,
            timestamp,
            errorMessage: null,
            permissionState: 'granted',
          }));
        }
      },
      (error: GeolocationPositionError) => {
        let msg = 'An unknown error occurred while retrieving location.';
        let permState: NativePermissionState = 'unknown';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission was denied in your browser settings.';
            permState = 'denied';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is currently unavailable on your device.';
            break;
          case error.TIMEOUT:
            msg = 'The location request timed out (10s limit).';
            break;
          default:
            msg = error.message || 'Position unavailable';
        }

        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: msg,
          permissionState: permState,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [isConfigured]);

  // Query native permission state & listen for permission changes
  useEffect(() => {
    let permissionStatusObj: PermissionStatus | null = null;

    const setupPermissionQuery = async () => {
      if ('permissions' in navigator && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          permissionStatusObj = permissionStatus;

          const currentPerm = permissionStatus.state as NativePermissionState;
          setState((prev) => ({ ...prev, permissionState: currentPerm }));

          // Automatically retrieve location if already granted or initial prompt
          if (!hasTriggeredInitialRef.current) {
            hasTriggeredInitialRef.current = true;
            requestNativeLocation();
          }

          // Listen for native permission changes (e.g. user toggles in browser address bar)
          const handlePermissionChange = () => {
            const updatedPerm = permissionStatus.state as NativePermissionState;
            setState((prev) => ({ ...prev, permissionState: updatedPerm }));

            if (updatedPerm === 'granted') {
              requestNativeLocation();
            } else if (updatedPerm === 'denied') {
              setState((prev) => ({
                ...prev,
                status: 'error',
                errorMessage: 'Location permission was denied in browser settings.',
                permissionState: 'denied',
              }));
            }
          };

          permissionStatus.addEventListener('change', handlePermissionChange);
          return () => {
            permissionStatus.removeEventListener('change', handlePermissionChange);
          };
        } catch {
          // Fallback if permissions query fails
          if (!hasTriggeredInitialRef.current) {
            hasTriggeredInitialRef.current = true;
            requestNativeLocation();
          }
        }
      } else {
        // Fallback for browsers without navigator.permissions
        if (!hasTriggeredInitialRef.current) {
          hasTriggeredInitialRef.current = true;
          requestNativeLocation();
        }
      }
    };

    setupPermissionQuery();
  }, [requestNativeLocation]);

  const handleCopyCoords = () => {
    if (state.latitude !== null && state.longitude !== null) {
      const text = `${state.latitude.toFixed(6)}, ${state.longitude.toFixed(6)}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSaved = state.status === 'success' && state.latitude !== null && state.longitude !== null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        id="share-location-card"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-stone-200/50 dark:shadow-none transition-all"
      >
        {/* CASE 1: When user auto added on database -> NO button, NO "Share Location" text */}
        {isSaved ? (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Icon */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            {/* Status Header */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                Location Saved to Database
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Your coordinates have been recorded automatically via native permission.
              </p>
            </div>

            {/* Coordinates Box */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 font-mono text-xs text-stone-800 dark:text-stone-200 space-y-2">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-stone-500 dark:text-stone-400 font-sans font-medium">Latitude</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                  {state.latitude?.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-stone-200/60 dark:border-stone-800/60 pt-2">
                <span className="text-stone-500 dark:text-stone-400 font-sans font-medium">Longitude</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                  {state.longitude?.toFixed(6)}
                </span>
              </div>
              {state.accuracy !== null && (
                <div className="flex justify-between items-center text-[11px] text-stone-500 pt-1.5 border-t border-stone-200/60 dark:border-stone-800/60">
                  <span className="font-sans">Accuracy</span>
                  <span>±{Math.round(state.accuracy)} meters</span>
                </div>
              )}
            </div>

            {/* Actions: Copy & Map View (No Share buttons) */}
            <div className="flex gap-2.5 pt-1">
              <button
                id="copy-coordinates-btn"
                type="button"
                onClick={handleCopyCoords}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Coords'}</span>
              </button>
              <a
                id="view-map-link"
                href={`https://www.google.com/maps?q=${state.latitude},${state.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm shadow-sky-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View on Map</span>
              </a>
            </div>

            {!isConfigured && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 text-center">
                Note: Supabase credentials not found in env. Stored locally.
              </p>
            )}
          </div>
        ) : (
          /* CASE 2: Native Permission Requesting or Permission Denied */
          <div>
            {/* Header Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-inner">
                {state.status === 'requesting' || state.status === 'saving' ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : state.permissionState === 'denied' ? (
                  <Lock className="w-7 h-7 text-rose-500" />
                ) : (
                  <Compass className="w-7 h-7 animate-pulse" />
                )}
              </div>
            </div>

            {/* Dynamic Status / Native Permission Heading */}
            <div className="text-center mb-6">
              <h1
                id="main-heading"
                className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight"
              >
                {state.status === 'requesting'
                  ? 'Requesting Native Permission...'
                  : state.status === 'saving'
                  ? 'Saving to Database...'
                  : state.permissionState === 'denied'
                  ? 'Native Permission Denied'
                  : 'Native Location Permission'}
              </h1>
              <p
                id="subtext-description"
                className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed"
              >
                {state.status === 'requesting' || state.status === 'saving'
                  ? 'Please confirm the browser prompt to allow location access.'
                  : state.permissionState === 'denied'
                  ? 'Location access was blocked. You can enable it in your browser address bar or site settings.'
                  : 'Your browser will prompt for location permission.'}
              </p>
            </div>

            {/* Native error notice */}
            {state.status === 'error' && state.errorMessage && (
              <div
                id="error-message-box"
                className="mb-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-rose-800 dark:text-rose-300 text-xs">
                      {state.permissionState === 'denied' ? 'Browser Permission Blocked' : 'Location Request'}
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                      {state.errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Trigger Button if blocked or prompt needed */}
            {(state.status === 'idle' || state.status === 'error') && (
              <div className="space-y-4">
                <button
                  id="native-permission-btn"
                  type="button"
                  onClick={requestNativeLocation}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] transition-all duration-200 shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{state.permissionState === 'denied' ? 'Retry Permission Check' : 'Allow Native Permission'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Security & Privacy footnote */}
        <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Supabase RLS Protected</span>
          </div>
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer"
            >
              Admin View &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
