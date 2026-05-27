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
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { convexClient } from '../convex/client';
import { api } from '../../convex/_generated/api';
import type { RootState, AppDispatch } from '../store';
import { addMessage, setLoading, clearChat, setSuggestedPrompts } from '../store/chatSlice';
import { dismissAlert } from '../store/alertSlice';
import { executeQuery, QueryPayload, QueryResult } from '../services/pythonBridge';
import { useLocation } from '../context/LocationContext';
import { getJurisdictionLabel } from '../services/locationService';
import { isDisclaimerShown, setDisclaimerShown } from '../services/storage';
import { ChatMessage } from '../components/ChatMessage';
import { VoiceInput } from '../components/VoiceInput';
import { AlertBanner } from '../components/AlertBanner';
import {
  Sparkles, Trash2, Settings, Info, X, Send,
  MapPin, Mic, MoreHorizontal, ChevronRight,
  ShieldCheck, ArrowRight
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, GLASS, SHADOWS } from '../constants/theme';

const DISCLAIMER_TEXT = 'Educational info only. For official advice, contact an RTO or legal professional.';

/* ─────────────────────────────────────────────
 *  Typing Indicator - Smooth Thinking State
 * ───────────────────────────────────────────── */
const ThinkingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -8, duration: 400, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.thinkingContainer}>
      <View style={styles.thinkingBubble}>
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
      </View>
      <Text style={styles.thinkingText}>TrafiAI is thinking...</Text>
    </View>
  );
};

/* ─────────────────────────────────────────────
 *  Suggested Prompt Chips
 * ───────────────────────────────────────────── */
const SuggestionChips = ({ suggestions, onSelect }: { suggestions: string[], onSelect: (s: string) => void }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.suggestionsScroll}
    >
      {suggestions.map((s, i) => (
        <TouchableOpacity
          key={i}
          style={styles.chip}
          onPress={() => onSelect(s)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{s}</Text>
          <ArrowRight size={12} color={COLORS.cyan} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

/* ─────────────────────────────────────────────
 *  Empty State - Modern AI Welcome
 * ───────────────────────────────────────────── */
const WelcomeHero = ({ onSuggest }: { onSuggest: (s: string) => void }) => (
  <View style={styles.heroContainer}>
    <View style={styles.heroAvatar}>
      <Sparkles size={40} color={COLORS.white} />
    </View>
    <Text style={styles.heroTitle}>How can I help you drive safely today?</Text>
    <Text style={styles.heroSubtitle}>
      Ask me about traffic fines, jurisdiction rules, or parking laws. I'm your legal mobility co-pilot.
    </Text>
    <View style={styles.heroActions}>
      {[
        "Helmet fine in Chennai",
        "Speed limits in Bengaluru",
        "Document requirements"
      ].map((item, idx) => (
        <TouchableOpacity key={idx} style={styles.heroActionBtn} onPress={() => onSuggest(item)}>
          <Text style={styles.heroActionText}>{item}</Text>
          <ChevronRight size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export const ChatScreen = ({ navigation, route }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { location, geoInfo, isLoading: isLocLoading } = useLocation();
  const messages = useSelector((state: RootState) => state.chat.messages);
  const loading = useSelector((state: RootState) => state.chat.loading);
  const suggestions = useSelector((state: RootState) => state.chat.suggestedPrompts);
  const language = useSelector((state: RootState) => state.settings.language);
  const activeAlert = useSelector((state: RootState) => state.alerts.activeAlert);
  const isOnline = useSelector((state: RootState) => state.convex.isOnline);

  const [inputText, setInputText] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const currentState = geoInfo?.state || 'TN';
  const locationName = geoInfo ? getJurisdictionLabel(geoInfo) : 'Detecting...';

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkDisclaimer();
    initPython();
  }, []);

  const checkDisclaimer = async () => {
    const shown = await isDisclaimerShown();
    setShowDisclaimer(!shown);
  };

  const initPython = async () => {
    try {
      const { initializePython } = await import('../services/pythonBridge');
      await initializePython();
    } catch (e) {}
  };

  const handleSendMessage = async (text?: string) => {
    const query = text || inputText;
    if (!query.trim()) return;

    dispatch(addMessage({
      id: Date.now().toString(),
      text: query,
      sender: 'user',
      timestamp: Date.now(),
    }));

    setInputText('');
    dispatch(setLoading(true));

    const chatHistory = messages.slice(-6).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    try {
      // 1. Online Logic (Claude via Convex)
      if (isOnline && convexClient) {
        try {
          const result = await convexClient.action(api.chat.askClaude, {
            query,
            language,
            locationContext: locationName,
            history: chatHistory,
          } as any) as any;

          dispatch(addMessage({
            id: (Date.now() + 1).toString(),
            text: result.response,
            sender: 'bot',
            timestamp: Date.now(),
            suggested_prompts: result.suggestions || []
          }));
          dispatch(setLoading(false));
          return;
        } catch (e) {
          console.warn("Claude failed, falling back...");
        }
      }

      // 2. Offline Logic (Local Python)
      const payload: QueryPayload = {
        action: 'query',
        text: query,
        location: {
          lat: location?.latitude || 0,
          lng: location?.longitude || 0,
          state: currentState,
          city: geoInfo?.city || undefined,
          district: geoInfo?.district || undefined,
        },
        language,
        history: chatHistory,
      };

      const result: QueryResult = await executeQuery(payload);

      dispatch(addMessage({
        id: (Date.now() + 1).toString(),
        text: (result as any).response_text || 'I encountered an issue. Please try again.',
        sender: 'bot',
        timestamp: Date.now(),
        source_sections: result.source_sections,
        confidence: result.confidence,
        suggested_prompts: (result as any).suggested_prompts || []
      }));

      if (showDisclaimer) {
        await setDisclaimerShown();
        setShowDisclaimer(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleVoiceInput = (uri: string) => {
    // Implement direct voice processing if needed,
    // or just handle speech-to-text here
  };

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronRight size={24} color={COLORS.white} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>AI Legal Assistant</Text>
            <View style={styles.locationRow}>
              <MapPin size={12} color={COLORS.cyan} />
              <Text style={styles.locationTxt}>{locationName}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => dispatch(clearChat())}>
            <Trash2 size={20} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 16 }}>
            <MoreHorizontal size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Chat Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage
              text={item.text}
              sender={item.sender}
              source_sections={item.source_sections}
              confidence={item.confidence}
            />
          )}
          contentContainerStyle={styles.messageList}
          inverted
          ListHeaderComponent={loading ? <ThinkingIndicator /> : null}
          ListFooterComponent={messages.length === 0 ? <WelcomeHero onSuggest={handleSendMessage} /> : null}
        />

        {/* Suggested Prompts & Input */}
        <View style={styles.footer}>
          {!loading && suggestions.length > 0 && (
            <SuggestionChips suggestions={suggestions} onSelect={handleSendMessage} />
          )}

          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <VoiceInput onVoiceInput={handleVoiceInput} />
              <TextInput
                style={styles.input}
                placeholder="Message TrafiAI..."
                placeholderTextColor={COLORS.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim() || loading}
                style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
              >
                <Send size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: COLORS.navy, ...SHADOWS.medium
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  headerTitle: { ...TYPOGRAPHY.h3, color: COLORS.white, fontWeight: 'bold' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  locationTxt: { ...TYPOGRAPHY.caption, color: COLORS.cyan },
  headerActions: { flexDirection: 'row', alignItems: 'center' },

  messageList: { padding: 16, paddingBottom: 24 },

  thinkingContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, marginLeft: 8 },
  thinkingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.1)', padding: 12, borderRadius: 20
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.cyan },
  thinkingText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginLeft: 10 },

  footer: { backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 30 : 12 },
  suggestionsScroll: { paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    ...SHADOWS.subtle
  },
  chipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },

  inputRow: { paddingHorizontal: 16, paddingVertical: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 28,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 8, ...SHADOWS.medium
  },
  input: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, color: COLORS.textPrimary, maxHeight: 100 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.navy,
    justifyContent: 'center', alignItems: 'center'
  },

  heroContainer: { padding: 24, alignItems: 'center', marginTop: 40, transform: [{ scaleY: -1 }] },
  heroAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.navy,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    ...SHADOWS.glow(COLORS.cyan)
  },
  heroTitle: { ...TYPOGRAPHY.h2, textAlign: 'center', color: COLORS.textPrimary },
  heroSubtitle: { ...TYPOGRAPHY.bodyMedium, textAlign: 'center', marginTop: 12, color: COLORS.textSecondary, lineHeight: 22 },
  heroActions: { width: '100%', marginTop: 32, gap: 12 },
  heroActionBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.subtle
  },
  heroActionText: { ...TYPOGRAPHY.bodyMedium, fontWeight: '600', color: COLORS.textPrimary }
});
