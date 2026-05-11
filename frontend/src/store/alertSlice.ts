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
  zone_type: string;       // accident_prone, school_zone, state_border, speed_change
  zone_name: string;       // Human-readable name (e.g., "Anna Salai Junction")
  message: string;         // Alert message text
  suggested_query: string; // Pre-filled chat query when user taps "Learn More"
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
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
    // Add a new zone alert (respects cooldown)
    addAlert: (state, action: PayloadAction<ZoneAlert>) => {
      const now = Date.now();
      const lastTime = state.lastAlertTimes[action.payload.zone_name] || 0;

      // Only alert if cooldown has passed
      if (now - lastTime > ALERT_COOLDOWN_MS) {
        state.alerts.push(action.payload);
        state.activeAlert = action.payload;
        state.lastAlertTimes[action.payload.zone_name] = now;
      }
    },
    dismissAlert: (state) => {
      state.activeAlert = null;
    },
    clearAlerts: (state) => {
      state.alerts = [];
      state.activeAlert = null;
    },
  },
});

export const { addAlert, dismissAlert, clearAlerts } = alertSlice.actions;

export default alertSlice.reducer;
