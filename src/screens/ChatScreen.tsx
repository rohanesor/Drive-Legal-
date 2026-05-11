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
import { addMessage, setLoading, clearChat, markDisclaimerShown } from '../store/chatSlice';
import { executeQuery, QueryPayload, QueryResult } from '../services/pythonBridge';
import { getCurrentLocation, getStateName } from '../services/location';
import { isDisclaimerShown, setDisclaimerShown } from '../services/storage';
import { ChatMessage } from '../components/ChatMessage';
import { VoiceInput } from '../components/VoiceInput';
import { AlertBanner } from '../components/AlertBanner';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DISCLAIMER_TEXT = 'This information is for educational purposes only. For official advice, contact your local RTO or legal professional.';

export const ChatScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const messages = useSelector((state: RootState) => state.chat.messages);
  const loading = useSelector((state: RootState) => state.chat.loading);
  const language = useSelector((state: RootState) => state.settings.language);
  const userState = useSelector((state: RootState) => state.settings.state);
  const activeAlert = useSelector((state: RootState) => state.alerts.activeAlert);

  const [inputText, setInputText] = useState('');
  const [currentState, setCurrentState] = useState(userState);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initLocation();
    checkDisclaimer();
    initPython();
  }, []);

  const initLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      setCurrentState(location.state);
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

  const handleSendMessage = async (text?: string) => {
    const queryText = text || inputText;
    if (!queryText.trim()) return;

    dispatch(addMessage({
      id: Date.now().toString(),
      text: queryText,
      sender: 'user',
      timestamp: new Date(),
    }));

    setInputText('');
    dispatch(setLoading(true));

    try {
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

      const result: QueryResult = await executeQuery(payload);

      if (result.status === 'success' && result.response_text) {
        dispatch(addMessage({
          id: (Date.now() + 1).toString(),
          text: result.response_text,
          sender: 'bot',
          timestamp: new Date(),
          source_sections: result.source_sections,
          confidence: result.confidence,
        }));

        if (showDisclaimer) {
          await setDisclaimerShown();
          setShowDisclaimer(false);
        }
      } else if (result.fallback_available && result.fallback_response_text) {
        dispatch(addMessage({
          id: (Date.now() + 1).toString(),
          text: result.fallback_response_text,
          sender: 'bot',
          timestamp: new Date(),
        }));
      } else {
        dispatch(addMessage({
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I could not process your request. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
        }));
      }
    } catch (error) {
      console.error('Error getting response:', error);
      dispatch(addMessage({
        id: (Date.now() + 1).toString(),
        text: 'Error: Could not get a response. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      }));
    } finally {
      dispatch(setLoading(false));
    }
  };

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
        if (result.source_sections) {
          dispatch(addMessage({
            id: Date.now().toString(),
            text: result.response_text,
            sender: 'bot',
            timestamp: new Date(),
            source_sections: result.source_sections,
            confidence: result.confidence,
          }));
        }
      } else if (result.fallback_available && result.fallback_response_text) {
        dispatch(addMessage({
          id: Date.now().toString(),
          text: result.fallback_response_text,
          sender: 'bot',
          timestamp: new Date(),
        }));
      }
    } catch (error) {
      console.error('Voice input error:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleClearChat = () => {
    dispatch(clearChat());
  };

  const renderMessage = ({ item }: { item: any }) => (
    <ChatMessage
      text={item.text}
      sender={item.sender}
      source_sections={item.source_sections}
      confidence={item.confidence}
      isAlert={item.is_alert}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>DriveLegal</Text>
          <Text style={styles.headerState}>
            State: {getStateName(currentState)} ({currentState})
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleClearChat} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {activeAlert && (
        <AlertBanner
          message={activeAlert.message}
          severity={activeAlert.severity}
          onLearnMore={() => handleSendMessage(activeAlert.suggested_query)}
          onDismiss={() => {}}
        />
      )}

      {showDisclaimer && (
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={16} color="#92400e" />
          <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
        </View>
      )}

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

        {loading && <ActivityIndicator size="large" color="#1e40af" style={styles.loader} />}

        <View style={styles.inputContainer}>
          <VoiceInput onVoiceInput={handleVoiceInput} />
          <TextInput
            style={styles.input}
            placeholder="Ask about traffic laws..."
            placeholderTextColor="#9ca3af"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#ffffff' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e40af',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerState: {
    color: '#e0e7ff',
    fontSize: 12,
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
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
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
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  sendButton: {
    backgroundColor: '#1e40af',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
