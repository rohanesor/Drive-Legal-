import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ZoneAlert {
  id: string;
  zone_type: string;
  zone_name: string;
  message: string;
  suggested_query: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  dismissed: boolean;
}

interface AlertState {
  alerts: ZoneAlert[];
  lastAlertTimes: Record<string, number>;
  activeAlert: ZoneAlert | null;
}

const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

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
      const lastTime = state.lastAlertTimes[action.payload.zone_name] || 0;

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
