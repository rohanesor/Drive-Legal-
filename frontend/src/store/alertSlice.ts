/**
 * Alert Slice - Redux state for zone-based traffic alerts
 * 
 * Manages:
 * - alerts: History of all triggered zone alerts
 * - lastAlertTimes: Tracks when each zone was last alerted (for cooldown)
 * - activeAlert: Currently displayed alert banner
 * 
 * ALERT COOLDOWN:
 * The same zone won't trigger more than once every 30 minutes
 * to prevent notification spam while driving through an area.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ZoneAlert {
  id: string;
  zone_type: string;
  zone_name: string;
  message: string;
  suggested_query: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  dismissed: boolean;
}

interface AlertState {
  alerts: ZoneAlert[];
  lastAlertTimes: Record<string, number>; // zone_name -> timestamp
  activeAlert: ZoneAlert | null;
}

// Cooldown period: 30 minutes between alerts for the same zone
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

const initialState: AlertState = {
  alerts: [],
  lastAlertTimes: {},
  activeAlert: null,
};

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addAlert: (state, action: PayloadAction<ZoneAlert>) => {
      const now = Date.now();
      const key = action.payload.id;
      const lastTime = state.lastAlertTimes[key] || 0;

      if (now - lastTime > ALERT_COOLDOWN_MS) {
        state.alerts.push(action.payload);
        state.activeAlert = action.payload;
        state.lastAlertTimes[key] = now;
      }

      // Evict entries older than 2x cooldown to prevent unbounded growth
      const staleThreshold = now - 2 * ALERT_COOLDOWN_MS;
      for (const k of Object.keys(state.lastAlertTimes)) {
        if (state.lastAlertTimes[k] < staleThreshold) {
          delete state.lastAlertTimes[k];
        }
      }
    },
    dismissAlert: (state) => {
      state.activeAlert = null;
    },
    clearAlerts: (state) => {
      state.alerts = [];
      state.activeAlert = null;
      state.lastAlertTimes = {};
    },
  },
});

export const { addAlert, dismissAlert, clearAlerts } = alertSlice.actions;

export default alertSlice.reducer;
