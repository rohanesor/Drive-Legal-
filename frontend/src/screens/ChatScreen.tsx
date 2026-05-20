/**
 * ChatScreen - The main screen where users interact with the DriveLegal chatbot
 * 
 * FEATURES:
 * 1. Text input for typing questions
 * 2. Voice input (press mic button to record)
 * 3. Chat history display (user messages on right, bot on left)
 * 4. Source citations and confidence indicators on bot responses
 * 5. Location-aware responses (detects user's state automatically)
 * 6. Zone alert banner (shown when user enters a traffic law zone)
 * 7. Legal disclaimer (shown once per session)
 * 8. Clear chat and settings buttons in header
 * 
 * DATA FLOW:
 * User types/speaks -> Send to Python bridge -> Python searches laws -> 
 * Python generates response -> Display in chat with citations
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { addMessage, setLoading, clearChat } from '../store/chatSlice';
import { dismissAlert } from '../store/alertSlice';
import { executeQuery, QueryPayload, QueryResult } from '../services/pythonBridge';
import { getCurrentLocation, getStateName } from '../services/location';
import { isDisclaimerShown, setDisclaimerShown } from '../services/storage';
import { ChatMessage } from '../components/ChatMessage';
import { VoiceInput } from '../components/VoiceInput';
import { AlertBanner } from '../components/AlertBanner';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

// Legal disclaimer text shown at start of each session
const DISCLAIMER_TEXT = 'This information is for educational purposes only. For official advice, contact your local RTO or legal professional.';

export const ChatScreen = ({ navigation, route }: any) => {
  // Redux state and dispatch
  const dispatch = useDispatch<AppDispatch>();
  const messages = useSelector((state: RootState) => state.chat.messages);
  const loading = useSelector((state: RootState) => state.chat.loading);
  const language = useSelector((state: RootState) => state.settings.language);
  const userState = useSelector((state: RootState) => state.settings.state);
  const activeAlert = useSelector((state: RootState) => state.alerts.activeAlert);

  // Local component state
  const [inputText, setInputText] = useState('');
  const [currentState, setCurrentState] = useState(userState);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Ref for scrolling to bottom of chat
  const flatListRef = useRef<FlatList>(null);

  /**
   * Initialize: detect location, check disclaimer status, preload Python models
   */
  useEffect(() => {
    initLocation();
    checkDisclaimer();
    initPython();
  }, []);

  // Process initialQuery passed from Dashboard or Calculator
  useEffect(() => {
    if (route?.params?.initialQuery) {
      handleSendMessage(route.params.initialQuery);
    }
  }, [route?.params?.initialQuery]);

  /**
   * Detect user's current state from GPS
   */
  const initLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      setCurrentState(location.state);
    }
  };

  /**
   * Check if disclaimer has been shown this session
   */
  const checkDisclaimer = async () => {
    const shown = await isDisclaimerShown();
    setShowDisclaimer(!shown);
  };

  /**
   * Preload Python models to reduce first-query latency
   */
  const initPython = async () => {
    try {
      const { initializePython } = await import('../services/pythonBridge');
      await initializePython();
    } catch (error) {
      console.error('Python init error:', error);
    }
  };

  /**
   * Handle sending a text message to the chatbot
   * 1. Add user message to chat
   2. Send to Python bridge
   3. Add bot response to chat
   */
  const handleSendMessage = async (text?: string) => {
    const queryText = text || inputText;
    if (!queryText.trim()) return;

    dispatch(addMessage({
      id: Date.now().toString(),
      text: queryText,
      sender: 'user',
      timestamp: Date.now(),
    }));

    setInputText('');
    dispatch(setLoading(true)); // Show loading spinner

    try {
      // Build the query payload for Python
      const payload: QueryPayload = {
        action: 'query',
        text: queryText,
        location: {
          lat: 0,
          lng: 0,
          state: currentState,
        },
        language,
      };

      // Send to Python backend for processing
      const result: QueryResult = await executeQuery(payload);

      // Handle successful response
      if (result.status === 'success' && result.response_text) {
        dispatch(addMessage({
          id: (Date.now() + 1).toString(),
          text: result.response_text,
          sender: 'bot',
          timestamp: Date.now(),
          source_sections: result.source_sections,
          confidence: result.confidence,
        }));

        // Mark disclaimer as shown after first response
        if (showDisclaimer) {
          await setDisclaimerShown();
          setShowDisclaimer(false);
        }
      } 
      // Handle fallback response (when LLM fails but template is available)
      else if (result.fallback_available && result.fallback_response_text) {
        dispatch(addMessage({
          id: (Date.now() + 1).toString(),
          text: result.fallback_response_text,
          sender: 'bot',
          timestamp: Date.now(),
        }));
      } 
      // Handle error
      else {
        dispatch(addMessage({
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I could not process your request. Please try again.',
          sender: 'bot',
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      console.error('Error getting response:', error);
      dispatch(addMessage({
        id: (Date.now() + 1).toString(),
        text: 'Error: Could not get a response. Please try again.',
        sender: 'bot',
        timestamp: Date.now(),
      }));
    } finally {
      dispatch(setLoading(false)); // Hide loading spinner
    }
  };

  /**
   * Handle voice input from the VoiceInput component
   * Recorded audio is sent to Python for Whisper transcription
   */
  const handleVoiceInput = async (audioUri: string) => {
    dispatch(setLoading(true));

    try {
      const payload: QueryPayload = {
        action: 'query',
        audio_uri: audioUri,
        location: {
          lat: 0,
          lng: 0,
          state: currentState,
        },
        language,
      };

      const result: QueryResult = await executeQuery(payload);

      if (result.status === 'success' && result.response_text) {
        dispatch(addMessage({
          id: Date.now().toString(),
          text: result.response_text,
          sender: 'bot',
          timestamp: Date.now(),
          source_sections: result.source_sections,
          confidence: result.confidence,
        }));
      } else if (result.fallback_available && result.fallback_response_text) {
        dispatch(addMessage({
          id: Date.now().toString(),
          text: result.fallback_response_text,
          sender: 'bot',
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      console.error('Voice input error:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Clear all messages (start new conversation)
   */
  const handleClearChat = () => {
    dispatch(clearChat());
  };

  /**
   * Render a single message in the chat list
   */
  const renderMessage = ({ item }: { item: any }) => (
    <ChatMessage
      text={item.text}
      sender={item.sender}
      source_sections={item.source_sections}
      confidence={item.confidence}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header: AI Assistant branding */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerBrandRow}>
            <View style={styles.headerAiBadge}>
              <Ionicons name="sparkles" size={16} color={COLORS.cyan} />
            </View>
            <View>
              <Text style={styles.headerTitle}>TrafiAI</Text>
              <Text style={styles.headerState}>
                {getStateName(currentState)} ({currentState})
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleClearChat} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Zone alert banner (shown when user enters a traffic law zone) */}
      {activeAlert && (
        <AlertBanner
          message={activeAlert.message}
          severity={activeAlert.severity}
          onLearnMore={() => handleSendMessage(activeAlert.suggested_query)}
          onDismiss={() => dispatch(dismissAlert())}
        />
      )}

      {/* Legal disclaimer (shown once per session) */}
      {showDisclaimer && (
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={16} color={COLORS.textWarning} />
          <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
        </View>
      )}

      {/* Chat messages list + input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          inverted
        />

        {/* Loading spinner while bot processes */}
        {loading && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}

        {/* Input bar: voice button + text input + send button */}
        <View style={styles.inputContainer}>
          <VoiceInput onVoiceInput={handleVoiceInput} />
          <TextInput
            style={styles.input}
            placeholder="Ask about traffic laws..."
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() ? { backgroundColor: COLORS.primary } : { backgroundColor: COLORS.border },
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? COLORS.white : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// Styles for the chat screen layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.navy,
  },
  headerLeft: {
    flex: 1,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAiBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerState: {
    color: COLORS.cyan,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.lightWarning,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderWarning,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textWarning,
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    padding: 8,
  },
  loader: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.large,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  sendButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
