/**
 * Chat Slice - Redux state for the chat conversation
 * 
 * Manages:
 * - messages: Array of user and bot messages
 * - loading: Whether the bot is currently processing a response
 * - disclaimerShown: Whether the legal disclaimer has been shown this session
 * 
 * Each message contains:
 * - id: Unique timestamp-based ID
 * - text: The message content
 * - sender: 'user' or 'bot'
 * - timestamp: When the message was sent
 * - source_sections: Law citations (e.g., "MV Act §188")
 * - confidence: Search confidence score (0-1)
 * - is_alert: Whether this is a zone alert message
 */
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
    // Add a new message to the conversation
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    // Toggle loading spinner while bot processes
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // Clear all messages (new chat)
    clearChat: (state) => {
      state.messages = [];
    },
    // Mark that disclaimer has been shown this session
    markDisclaimerShown: (state) => {
      state.disclaimerShown = true;
    },
    // Add a zone alert as a special message type
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
