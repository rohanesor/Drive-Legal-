import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
  source_sections?: string[];
  confidence?: number;
  is_alert?: boolean;
  zone_type?: string;
  suggested_prompts?: string[];
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  disclaimerShown: boolean;
  suggestedPrompts: string[];
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  disclaimerShown: false,
  suggestedPrompts: [
    "Helmet fine in TN",
    "Speeding rules",
    "Can I park here?",
    "License requirements"
  ],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
      // Update the current suggestions if the bot provided any
      if (action.payload.sender === 'bot' && action.payload.suggested_prompts) {
        state.suggestedPrompts = action.payload.suggested_prompts;
      }
    },
    updateMessageText: (state, action: PayloadAction<{ id: string; text: string }>) => {
      const msg = state.messages.find(m => m.id === action.payload.id);
      if (msg) {
        msg.text = action.payload.text;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSuggestedPrompts: (state, action: PayloadAction<string[]>) => {
      state.suggestedPrompts = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.suggestedPrompts = initialState.suggestedPrompts;
    },
    markDisclaimerShown: (state) => {
      state.disclaimerShown = true;
    },
  },
});

export const {
  addMessage,
  updateMessageText,
  setLoading,
  setSuggestedPrompts,
  clearChat,
  markDisclaimerShown,
} = chatSlice.actions;

export default chatSlice.reducer;
