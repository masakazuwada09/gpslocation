export interface LocationRecord {
  id?: string;
  lat: number;
  lng: number;
  created_at?: string;
}

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'saving'
  | 'success'
  | 'error';

export type NativePermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';

export interface LocationState {
  status: GeolocationStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  errorMessage: string | null;
  permissionState: NativePermissionState;
}
