import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline' | 'error';

interface ConvexState {
  syncStatus: SyncStatus;
  lastSync: number;
  isOnline: boolean;
  syncError: string | null;
}

const initialState: ConvexState = {
  syncStatus: 'idle',
  lastSync: 0,
  isOnline: false,
  syncError: null,
};

const convexSlice = createSlice({
  name: 'convex',
  initialState,
  reducers: {
    setSyncStatus: (state, action: PayloadAction<SyncStatus>) => {
      state.syncStatus = action.payload;
      state.isOnline = action.payload === 'online';
    },
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },
    setSyncError: (state, action: PayloadAction<string | null>) => {
      state.syncError = action.payload;
    },
  },
});

export const { setSyncStatus, setLastSync, setSyncError } = convexSlice.actions;
export default convexSlice.reducer;
