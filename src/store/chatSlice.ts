import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  source_sections?: string[];
  confidence?: number;
  is_alert?: boolean;
  zone_type?: string;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  disclaimerShown: boolean;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  disclaimerShown: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
    },
    markDisclaimerShown: (state) => {
      state.disclaimerShown = true;
    },
    addAlertMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push({ ...action.payload, is_alert: true });
    },
  },
});

export const {
  addMessage,
  setLoading,
  clearChat,
  markDisclaimerShown,
  addAlertMessage,
} = chatSlice.actions;

export default chatSlice.reducer;
