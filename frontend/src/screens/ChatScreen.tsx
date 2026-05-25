import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { convexClient } from '../convex/client';
import { api } from '../../convex/_generated/api';
import type { RootState, AppDispatch } from '../store';
import { addMessage, setLoading, clearChat } from '../store/chatSlice';
import { dismissAlert } from '../store/alertSlice';
import { executeQuery, QueryPayload, QueryResult } from '../services/pythonBridge';
import { getCurrentLocation, getStateName, reverseGeocode } from '../services/location';
import { isDisclaimerShown, setDisclaimerShown } from '../services/storage';
import { ChatMessage } from '../components/ChatMessage';
import { VoiceInput } from '../components/VoiceInput';
import { AlertBanner } from '../components/AlertBanner';
import { Sparkles, Trash2, Settings, Info, X, Send } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, GLASS } from '../constants/theme';

const DISCLAIMER_TEXT = 'This information is for educational purposes only. For official advice, contact your local RTO or legal professional.';

/* ─────────────────────────────────────────────
 *  Typing Indicator – three animated cyan dots
 * ───────────────────────────────────────────── */
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
      );

    const anim = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const dotStyle = (opacity: Animated.Value) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cyan,
    marginHorizontal: 3,
    opacity,
  });

  return (
    <View style={typingStyles.wrapper}>
      <View style={typingStyles.bubble}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.18)',
    borderRadius: BORDER_RADIUS.large,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

/* ─────────────────────────────────────────────
 *  Empty-state welcome card
 * ───────────────────────────────────────────── */
const EmptyState = () => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.iconWrap}>
      <Sparkles size={48} color={COLORS.cyan} />
    </View>
    <Text style={emptyStyles.title}>Welcome to TrafiAI</Text>
    <Text style={emptyStyles.subtitle}>
      Ask me anything about Indian traffic laws
    </Text>
  </View>
);

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    // FlatList is inverted so we flip the empty state to keep it upright
    transform: [{ scaleY: -1 }],
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(6, 182, 212, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

/* ─────────────────────────────────────────────
 *  Main Chat Screen
 * ───────────────────────────────────────────── */
export const ChatScreen = ({ navigation, route }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  // convexClient is null when no Convex backend is configured (offline-only mode)
  const messages = useSelector((state: RootState) => state.chat.messages);
  const loading = useSelector((state: RootState) => state.chat.loading);
  const language = useSelector((state: RootState) => state.settings.language);
  const userState = useSelector((state: RootState) => state.settings.state);
  const activeAlert = useSelector((state: RootState) => state.alerts.activeAlert);
  const isOnline = useSelector((state: RootState) => state.convex.isOnline);

  const [inputText, setInputText] = useState('');
  const [currentState, setCurrentState] = useState(userState);
  const [currentCity, setCurrentCity] = useState('');
  const [currentDistrict, setCurrentDistrict] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // ── AI badge pulse animation ──
  const badgePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(badgePulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    initLocation();
    checkDisclaimer();
    initPython();
  }, []);

  useEffect(() => {
    setCurrentState(userState);
  }, [userState]);

  useEffect(() => {
    if (route?.params?.initialQuery) {
      handleSendMessage(route.params.initialQuery);
    }
  }, [route?.params?.initialQuery]);

  const initLocation = async () => {
    const location = await getCurrentLocation(userState);
    if (location) {
      setCurrentState(location.state);
      setCurrentCity(location.city || '');
      setCurrentDistrict(location.district || '');
    }
  };

  const checkDisclaimer = async () => {
    const shown = await isDisclaimerShown();
    setShowDisclaimer(!shown);
  };

  const initPython = async () => {
    try {
      const { initializePython } = await import('../services/pythonBridge');
      await initializePython();
    } catch (error) {
      console.error('Python init error:', error);
    }
  };

  const addBotMessage = (text: string, sections?: string[], confidence?: number) => {
    dispatch(addMessage({
      id: (Date.now() + 1).toString(),
      text,
      sender: 'bot',
      timestamp: Date.now(),
      source_sections: sections,
      confidence,
    }));
  };

  const handleSendMessage = async (text?: string) => {
    const queryText = text || inputText;
    if (!queryText.trim()) return;

    dispatch(addMessage({
      id: Date.now().toString(),
      text: queryText,
      sender: 'user',
      timestamp: Date.now(),
    }));

    // Extract the past 6 conversation turns to feed as context history
    const chatHistory = messages
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    setInputText('');
    dispatch(setLoading(true));

    try {
      // Online path: Convex → Claude API (via HTTP action)
      if (isOnline && convexClient) {
        try {
          const locationParts = [
            currentCity,
            currentDistrict,
            getStateName(currentState),
            'India',
          ].filter(Boolean).join(', ');

          const result = await convexClient.action(api.chat.askClaude, {
            query: queryText,
            language,
            locationContext: locationParts,
            history: chatHistory,
          } as any) as { response: string; source: string; confidence: string };

          addBotMessage(result.response);
          if (showDisclaimer) {
            await setDisclaimerShown();
            setShowDisclaimer(false);
          }
          dispatch(setLoading(false));
          return;
        } catch (claudeError) {
          console.warn('Claude API failed, falling back to offline:', claudeError);
        }
      }

      // Offline/local path: Python Chaquopy (existing flow)
      const payload: QueryPayload = {
        action: 'query',
        text: queryText,
        location: {
          lat: 0,
          lng: 0,
          state: currentState,
        },
        language,
        history: chatHistory,
      };

      const result: QueryResult = await executeQuery(payload);

      if (result.status === 'success' && result.response_text) {
        addBotMessage(result.response_text, result.source_sections, result.confidence);
        if (showDisclaimer) {
          await setDisclaimerShown();
          setShowDisclaimer(false);
        }
      } else if (result.fallback_available && result.fallback_response_text) {
        addBotMessage(result.fallback_response_text);
      } else {
        addBotMessage('Sorry, I could not process your request. Please try again.');
      }
    } catch (error) {
      console.error('Error getting response:', error);
      addBotMessage('Error: Could not get a response. Please try again.');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleVoiceInput = async (audioUri: string) => {
    dispatch(setLoading(true));

    const chatHistory = messages
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

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
        history: chatHistory,
      };

      const result: QueryResult = await executeQuery(payload);

      if (result.status === 'success' && result.response_text) {
        addBotMessage(result.response_text, result.source_sections, result.confidence);
      } else if (result.fallback_available && result.fallback_response_text) {
        addBotMessage(result.fallback_response_text);
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
            <Animated.View style={[styles.headerAiBadge, { transform: [{ scale: badgePulse }] }]}>
              <Sparkles size={16} color={COLORS.cyan} />
            </Animated.View>
            <View>
              <Text style={styles.headerTitle}>TrafiAI</Text>
              <Text style={styles.headerState}>
                {currentCity
                  ? `${currentCity}, ${getStateName(currentState)}`
                  : `${getStateName(currentState)} (${currentState})`}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleClearChat} style={styles.headerButton}>
            <Trash2 size={20} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
          >
            <Settings size={20} color={COLORS.white} />
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
          <Info size={16} color={COLORS.textWarning} />
          <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
          <TouchableOpacity
            onPress={() => setShowDisclaimer(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.disclaimerClose}
          >
            <X size={16} color={COLORS.textWarning} />
          </TouchableOpacity>
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
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && { flexGrow: 1 },
          ]}
          inverted
          ListEmptyComponent={<EmptyState />}
        />

        {/* Animated typing indicator while bot processes */}
        {loading && <TypingIndicator />}

        {/* Input bar: voice button + text input + send button */}
        <View style={styles.inputContainer}>
          <VoiceInput onVoiceInput={handleVoiceInput} />
          <TextInput
            style={styles.input}
            placeholder="Ask about traffic laws..."
            placeholderTextColor={'rgba(255, 255, 255, 0.4)'}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim()
                ? { backgroundColor: COLORS.cyan }
                : { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
          >
            <Send
              size={18}
              color={inputText.trim() ? COLORS.white : 'rgba(255, 255, 255, 0.35)'}
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
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: COLORS.navy,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.2)',
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
  disclaimerClose: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(146, 64, 14, 0.10)',
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.navy,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: BORDER_RADIUS.large,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: COLORS.white,
  },
  sendButton: {
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
