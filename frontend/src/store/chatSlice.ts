/**
 * Chat Slice
 *
 * Manages the AI conversation state:
 * - messages:     Ordered list of user/bot messages with citations and confidence
 * - loading:      True while the AI pipeline (FAISS + LLM) is processing
 * - disclaimerShown: Whether the legal disclaimer has been acknowledged this session
 * - suggestedPrompts: Dynamic suggestions updated after each bot response
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessageItem } from '../types';

interface ChatState {
  messages: ChatMessageItem[];
  loading: boolean;
  disclaimerShown: boolean;
  suggestedPrompts: string[];
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  disclaimerShown: false,
  suggestedPrompts: [
    'Helmet fine in TN',
    'Speeding rules',
    'Can I park here?',
    'License requirements',
  ],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessageItem>) => {
      state.messages.push(action.payload);
      // Update the current suggestions if the bot provided any
      if (action.payload.sender === 'bot' && action.payload.suggested_prompts) {
        state.suggestedPrompts = action.payload.suggested_prompts;
      }
    },
    updateMessageText: (
      state,
      action: PayloadAction<{ id: string; text: string }>,
    ) => {
      const msg = state.messages.find((m) => m.id === action.payload.id);
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
