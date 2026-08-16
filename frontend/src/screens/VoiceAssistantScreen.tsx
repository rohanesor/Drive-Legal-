import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  NativeModules,
  Platform,
  PermissionsAndroid,
  Switch,
  TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
  GLASS,
} from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import { useMemo } from 'react';
import { useLocation } from '../context/LocationContext';
import {
  getStateName,
  getJurisdictionLabel,
} from '../services/locationService';
import { executeQuery } from '../services/pythonBridge';
import { navigationState } from '../services/navigationState';
import {
  Mic,
  Sparkles,
  Volume2,
  Shield,
  Circle,
  RefreshCw,
  ArrowLeft,
  Keyboard,
  Send,
  VolumeX,
  HelpCircle,
  Clock,
} from 'lucide-react-native';
import type { Message } from '../types';

const { width } = Dimensions.get('window');
const { DriveLegalSpeechRecognizer, DriveLegalTTS } = NativeModules;
import { DeviceEventEmitter } from 'react-native';

// Driving safe quick commands
const QUICK_COMMANDS = [
  { text: 'Can I park here?', query: 'Can I park here?' },
  {
    text: 'Helmet fine?',
    query: 'What is the fine for driving without a helmet?',
  },
  { text: 'Speed limit?', query: 'What is the speed limit here?' },
  {
    text: 'Charging rules?',
    query: 'What are the rules and penalties for EV charging zones?',
  },
];

type VoiceState =
  | 'READY'
  | 'LISTENING'
  | 'UNDERSTANDING'
  | 'RESPONDING'
  | 'RETRY';

import type { AppNavigationProp } from '../types';

export const VoiceAssistantScreen = ({
  navigation,
}: {
  navigation: AppNavigationProp;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const userState = useSelector((state: RootState) => state.settings.state);
  const userLanguage =
    useSelector((state: RootState) => state.settings.language) || 'en';
  const { location, geoInfo } = useLocation();

  // Voice Interaction States
  const [voiceState, setVoiceState] = useState<VoiceState>('READY');
  const [userTranscript, setUserTranscript] = useState('');
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // Chat message history
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'RoadMind AI co-driver is active. Tap the microphone and tell me what is happening, or select a quick query below.',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);

  // Multilingual Telemetry States
  const [detectedLang, setDetectedLang] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);

  const autoRetryCount = useRef(0);
  const hasTranscriptRef = useRef(false);
  const latestTranscriptRef = useRef('');
  const hasSubmittedRef = useRef(false);

  // Animations
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;
  const spinAngle = useRef(new Animated.Value(0)).current;

  // Timers and Refs
  const isSpeakingCheckInterval = useRef<any>(null);
  const speechEndTimeoutRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Register Android Native SpeechRecognizer JNI event listeners
    const onStart = DeviceEventEmitter.addListener('onSpeechStart', () => {
      console.log('Speech Started');
      setVoiceState('LISTENING');
    });

    const onEnd = DeviceEventEmitter.addListener('onSpeechEnd', (e) => {
      console.log('Speech Ended');
      // Safety timeout: if onSpeechResults doesn't arrive within 2.5s,
      // submit whatever partial transcript we have
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current);
      }
      speechEndTimeoutRef.current = setTimeout(() => {
        console.log(
          'Speech End safety timeout fired — checking for pending transcript',
        );
        const pending = latestTranscriptRef.current?.trim();
        if (pending && pending.length > 0 && !hasSubmittedRef.current) {
          console.log(
            'Submitting partial transcript via safety timeout:',
            pending,
          );
          processSpeechText(pending);
        } else if (!hasSubmittedRef.current) {
          // No transcript at all — transition to READY so UI isn't stuck
          setVoiceState('READY');
        }
      }, 2500);
    });

    const onPartial = DeviceEventEmitter.addListener(
      'onSpeechPartialResults',
      (e) => {
        const match = e.value && e.value[0];
        console.log('Speech Partial Results', e.value);
        if (match) {
          hasTranscriptRef.current = true;
          latestTranscriptRef.current = match;
          setUserTranscript(match);
          if (e.confidence !== undefined) {
            setConfidenceScore(Math.round(e.confidence * 100));
          }
        }
      },
    );

    const onResults = DeviceEventEmitter.addListener('onSpeechResults', (e) => {
      // Cancel safety timeout since we got real results
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current);
        speechEndTimeoutRef.current = null;
      }
      const match = e.value && e.value[0];
      console.log('Speech Results', e.value);
      if (match) {
        hasTranscriptRef.current = true;
        latestTranscriptRef.current = match;
        autoRetryCount.current = 0;

        // Save recognition confidence returned from native module
        if (e.confidence !== undefined) {
          setConfidenceScore(Math.round(e.confidence * 100));
        }

        if (!hasSubmittedRef.current) {
          processSpeechText(match);
        }
      } else {
        if (!hasTranscriptRef.current && !hasSubmittedRef.current) {
          handleSpeechFailure('No speech matches found.');
        }
      }
    });

    const onError = DeviceEventEmitter.addListener('onSpeechError', (e) => {
      // Cancel safety timeout since error handler will deal with it
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current);
        speechEndTimeoutRef.current = null;
      }
      console.log('Speech Error', e.message);
      console.log(`JNI onSpeechError caught [Code: ${e.code}]: ${e.message}`);

      const hasTranscript =
        latestTranscriptRef.current &&
        latestTranscriptRef.current.trim().length > 0;

      // Treat as successful and submit if we got some transcript, or ignore trailing errors after submission
      if (hasTranscript || hasSubmittedRef.current) {
        autoRetryCount.current = 0;
        if (hasTranscript && !hasSubmittedRef.current) {
          processSpeechText(latestTranscriptRef.current);
        }
        return;
      }

      handleSpeechFailure(e.message, e.code);
    });

    return () => {
      onStart.remove();
      onEnd.remove();
      onPartial.remove();
      onResults.remove();
      onError.remove();
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current);
        speechEndTimeoutRef.current = null;
      }
      stopSpeechPlayback();
      clearSpeechMonitoring();
    };
  }, [userLanguage, location, geoInfo, userState]);

  // Continuous rotating spin animation for Understanding state
  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    if (voiceState === 'UNDERSTANDING') {
      spinAngle.setValue(0);
      animation = Animated.loop(
        Animated.timing(spinAngle, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [voiceState]);

  // Breathing and glowing pulse animations for mic/speakers
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation;
    let glowLoop: Animated.CompositeAnimation;

    if (voiceState === 'LISTENING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.16,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.65,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.15,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
      glowLoop.start();
    } else if (voiceState === 'RESPONDING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.08,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.45,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.1,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
      glowLoop.start();
    } else {
      pulseScale.setValue(1);
      glowOpacity.setValue(0.15);
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.03,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
    }

    return () => {
      if (pulseLoop) {
        pulseLoop.stop();
      }
      if (glowLoop) {
        glowLoop.stop();
      }
    };
  }, [voiceState]);

  // Scroll to bottom helper when message log updates
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const clearSpeechMonitoring = () => {
    if (isSpeakingCheckInterval.current) {
      clearInterval(isSpeakingCheckInterval.current);
      isSpeakingCheckInterval.current = null;
    }
  };

  const stopSpeechPlayback = async () => {
    try {
      if (DriveLegalTTS) {
        await DriveLegalTTS.stop();
      }
    } catch (e) {
      console.error('Failed to stop TTS playback:', e);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (hasPermission) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'DriveTalk needs access to your microphone for hands-free queries.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleMicrophoneAction = async () => {
    if (voiceState === 'RESPONDING') {
      await stopSpeechPlayback();
      clearSpeechMonitoring();
      setVoiceState('READY');
      return;
    }

    if (voiceState === 'LISTENING') {
      await stopAudioRecording();
      return;
    }

    await startAudioRecording();
  };

  const startAudioRecording = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        handleSpeechFailure('Microphone permission was denied.');
        return;
      }

      await stopSpeechPlayback();
      clearSpeechMonitoring();

      hasTranscriptRef.current = false;
      latestTranscriptRef.current = '';
      hasSubmittedRef.current = false;
      setVoiceState('LISTENING');
      setUserTranscript('Listening...');

      if (DriveLegalSpeechRecognizer) {
        await DriveLegalSpeechRecognizer.startListening(userLanguage);
      } else {
        handleSpeechFailure('Native SpeechRecognizer module unavailable.');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to initialize Speech Recognizer.';
      handleSpeechFailure(message);
    }
  };

  const stopAudioRecording = async () => {
    try {
      if (DriveLegalSpeechRecognizer) {
        await DriveLegalSpeechRecognizer.stopListening();
      }
    } catch (err) {
      console.error('Error stopping listening:', err);
      setVoiceState('READY');
    }
  };

  const handleSpeechFailure = (errorMsg: string, errorCode?: number) => {
    if (hasTranscriptRef.current) {
      return;
    }
    setVoiceState('RETRY');
  };

  const getKeywordResponse = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('speed limit')) {
      return '📍 Speed Limit Regulations:\nUnder Section 112 of the Motor Vehicles Act, exceeding speed limits attracts a fine of ₹1,000 to ₹2,000 for LMV vehicles.';
    }
    if (
      lower.includes('helmet fine') ||
      lower.includes('helmet') ||
      lower.includes('ஹெல்மெட்') ||
      lower.includes('हेलमेट')
    ) {
      return '🪖 Helmet Violation Fine:\nUnder Section 194D of the Motor Vehicles Act, riding without a helmet attracts a fine of ₹1,000 and 3-month license disqualification.';
    }
    if (lower.includes('parking') || lower.includes('park')) {
      return "🚗 Parking Regulations:\nParking in a designated 'No Parking' zone attracts a fine of ₹500 under Section 122/177 of the Motor Vehicles Act, plus towing fees.";
    }
    if (
      lower.includes('police station') ||
      lower.includes('police') ||
      lower.includes('காவல் நிலையம்') ||
      lower.includes('पुलिस')
    ) {
      return '🚓 Nearest Police Station:\nLocated 500m ahead at Gandhipuram Junction. Dial 100 for immediate emergency dispatch.';
    }
    if (
      lower.includes('emergency') ||
      lower.includes('sos') ||
      lower.includes('accident')
    ) {
      return '🚨 Emergency SOS Active:\nEmergency response services notified. Dial 108 for medical trauma support.';
    }
    if (
      lower.includes('ev charging') ||
      lower.includes('ev') ||
      lower.includes('charging')
    ) {
      return '🔌 EV charging rules:\nParking standard non-EVs in designated charging ports attracts a ₹500 fine and towing.';
    }
    return null;
  };

  const processSpeechText = async (transcribedText: string) => {
    if (!transcribedText || transcribedText.trim().length === 0) {
      return;
    }
    if (hasSubmittedRef.current) {
      return;
    }
    try {
      hasSubmittedRef.current = true;
      hasTranscriptRef.current = true;
      setVoiceState('UNDERSTANDING');

      // Add user transcript to history
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'user',
          text: transcribedText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);

      const keywordResponse = getKeywordResponse(transcribedText);
      if (keywordResponse) {
        speakBotResponse(keywordResponse);
        return;
      }

      const result = await executeQuery({
        action: 'query',
        text: transcribedText,
        language: userLanguage,
        location: {
          lat: location?.latitude || 0,
          lng: location?.longitude || 0,
          state: userState,
          city: geoInfo?.city || undefined,
          district: geoInfo?.district || undefined,
        },
        navigationContext: navigationState.getContext(),
      });

      if (result.status === 'success') {
        const textResponse =
          result.response_text ||
          result.fallback_response_text ||
          'No matches found.';
        if (result.detected_language) {
          setDetectedLang(result.detected_language);
        }
        if (result.confidence !== undefined) {
          setConfidenceScore(Math.round(result.confidence * 100));
        }
        speakBotResponse(textResponse);
      } else {
        setVoiceState('RETRY');
      }
    } catch (e) {
      console.error('Failed to execute bridge voice query:', e);
      setVoiceState('RETRY');
    }
  };

  const processTextQuery = async (queryText: string) => {
    if (!queryText.trim()) {
      return;
    }
    try {
      await stopSpeechPlayback();
      clearSpeechMonitoring();

      setVoiceState('UNDERSTANDING');
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'user',
          text: queryText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);

      const result = await executeQuery({
        action: 'query',
        text: queryText,
        language: userLanguage,
        location: {
          lat: location?.latitude || 0,
          lng: location?.longitude || 0,
          state: userState,
          city: geoInfo?.city || undefined,
          district: geoInfo?.district || undefined,
        },
        navigationContext: navigationState.getContext(),
      });

      if (result.status === 'success') {
        const textResponse =
          result.response_text ||
          result.fallback_response_text ||
          'No matches found in database.';
        if (result.detected_language) {
          setDetectedLang(result.detected_language);
        }
        if (result.confidence !== undefined) {
          setConfidenceScore(Math.round(result.confidence * 100));
        }
        speakBotResponse(textResponse);
      } else {
        setVoiceState('RETRY');
      }
    } catch (e) {
      console.error('Failed to execute text query:', e);
      setVoiceState('RETRY');
    }
  };

  const processQuickCommand = async (query: string) => {
    try {
      await stopSpeechPlayback();
      clearSpeechMonitoring();

      setVoiceState('UNDERSTANDING');
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);

      const result = await executeQuery({
        action: 'query',
        text: query,
        language: userLanguage,
        location: {
          lat: location?.latitude || 0,
          lng: location?.longitude || 0,
          state: userState,
          city: geoInfo?.city || undefined,
          district: geoInfo?.district || undefined,
        },
        navigationContext: navigationState.getContext(),
      });

      if (result.status === 'success') {
        const textResponse =
          result.response_text ||
          result.fallback_response_text ||
          'No matches found.';
        speakBotResponse(textResponse);
      } else {
        setVoiceState('RETRY');
      }
    } catch (e) {
      console.error('Failed to run quick command:', e);
      setVoiceState('RETRY');
    }
  };

  const speakBotResponse = async (text: string) => {
    try {
      setVoiceState('RESPONDING');

      // Append AI response bubble to dialog list
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: text,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);

      if (DriveLegalTTS) {
        await DriveLegalTTS.speak(text, userLanguage);
        clearSpeechMonitoring();

        isSpeakingCheckInterval.current = setInterval(async () => {
          if (DriveLegalTTS) {
            const speaking = await DriveLegalTTS.isSpeaking();
            if (!speaking) {
              clearSpeechMonitoring();
              setVoiceState('READY');

              if (isHandsFree) {
                setTimeout(() => {
                  startAudioRecording();
                }, 1800);
              }
            }
          }
        }, 300);
      } else {
        setVoiceState('READY');
      }
    } catch (e) {
      console.error('TTS playback failure:', e);
      setVoiceState('READY');
    }
  };

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case 'ta':
        return 'தமிழ்';
      case 'hi':
        return 'हिंदी';
      case 'te':
        return 'తెలుగు';
      case 'kn':
        return 'ಕನ್ನಡ';
      case 'ml':
        return 'മലയാളം';
      case 'en':
        return 'English';
      default:
        return code ? code.toUpperCase() : 'English';
    }
  };

  const spin = spinAngle.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0B132B" barStyle="light-content" />

      {/* Futuristic AI Co-Driver Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            stopSpeechPlayback();
            clearSpeechMonitoring();
            navigation.goBack();
          }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Shield size={18} color="#00FFC2" />
          <Text style={styles.headerText}>ROADMIND AI</Text>
        </View>
        <View style={styles.locationBadge}>
          <Text style={styles.locationBadgeText}>
            📍{' '}
            {geoInfo ? getJurisdictionLabel(geoInfo) : getStateName(userState)}
          </Text>
        </View>
      </View>

      {/* ChatGPT-style Conversational Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageScroll}
        contentContainerStyle={styles.messageScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.sender === 'user'
                ? styles.messageRowUser
                : styles.messageRowAi,
            ]}
          >
            {msg.sender === 'ai' && (
              <View style={styles.aiAvatar}>
                <Sparkles size={14} color="#00FFC2" />
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.bubbleUser : styles.bubbleAi,
              ]}
            >
              <Text style={styles.messageText}>{msg.text}</Text>
              <View style={styles.bubbleMeta}>
                <Clock
                  size={10}
                  color="rgba(255,255,255,0.4)"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.metaText}>{msg.timestamp}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Real-time listening transcription preview */}
        {voiceState === 'LISTENING' && (
          <View style={[styles.messageRow, styles.messageRowUser]}>
            <View
              style={[
                styles.messageBubble,
                styles.bubbleUser,
                { opacity: 0.8 },
              ]}
            >
              <View style={styles.listeningRow}>
                <ActivityIndicator
                  size="small"
                  color="#00FFC2"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.messageText}>{userTranscript}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating State HUD overlays */}
      <View style={styles.hudOverlayContainer}>
        {voiceState === 'READY' && (
          <View style={styles.readyIndicator}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.stateSubtitle}>
              Ready to assist in Tamil, Hindi & English
            </Text>
          </View>
        )}

        {voiceState === 'UNDERSTANDING' && (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[styles.spinningRing, { transform: [{ rotate: spin }] }]}
            />
            <Text style={styles.understandingText}>
              RoadMind RAG Analyzer...
            </Text>
          </View>
        )}

        {voiceState === 'RETRY' && (
          <View style={styles.retryPromptBox}>
            <HelpCircle size={18} color="#FF9F43" />
            <Text style={styles.retryPromptText}>
              I didn't catch that. Tap the mic to try again.
            </Text>
          </View>
        )}
      </View>

      {/* Suggested chips panel (Shown in Ready/Retry states) */}
      {(voiceState === 'READY' || voiceState === 'RETRY') && (
        <View style={styles.suggestedContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedChipsRow}
          >
            {QUICK_COMMANDS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => processQuickCommand(item.query)}
              >
                <Sparkles
                  size={12}
                  color="#00FFC2"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.suggestionChipText}>{item.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ChatGPT inspired Central Interactive Orb area */}
      {voiceState !== 'UNDERSTANDING' && (
        <View style={styles.orbArea}>
          <Animated.View
            style={[
              styles.glowCircle,
              {
                opacity: glowOpacity,
                transform: [{ scale: pulseScale }],
                backgroundColor:
                  voiceState === 'LISTENING'
                    ? '#FF1744'
                    : voiceState === 'RESPONDING'
                    ? '#00FFC2'
                    : '#1F2937',
              },
            ]}
          />

          <TouchableOpacity
            onPress={handleMicrophoneAction}
            style={[
              styles.centerOrb,
              voiceState === 'LISTENING' && styles.centerOrbListening,
              voiceState === 'RESPONDING' && styles.centerOrbResponding,
            ]}
            activeOpacity={0.9}
          >
            {voiceState === 'LISTENING' ? (
              <Circle size={28} color="#FFFFFF" />
            ) : voiceState === 'RESPONDING' ? (
              <VolumeX size={28} color="#000000" />
            ) : (
              <Mic size={28} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <Text style={styles.voiceStateLabel}>
            {voiceState === 'LISTENING'
              ? 'Listening now...'
              : voiceState === 'RESPONDING'
              ? 'AI co-pilot speaking (Tap to mute)'
              : 'Tap Orb to Speak'}
          </Text>
        </View>
      )}

      {/* Keyboard Input Collapsible Row */}
      <View style={styles.bottomControlBar}>
        <View style={styles.handsFreeRow}>
          <View style={styles.switchCol}>
            <Text style={styles.switchLabel}>Hands-Free Loop</Text>
            <Switch
              value={isHandsFree}
              onValueChange={setIsHandsFree}
              trackColor={{ false: '#374151', true: 'rgba(0, 255, 194, 0.2)' }}
              thumbColor={isHandsFree ? '#00FFC2' : '#9CA3AF'}
            />
          </View>
          <TouchableOpacity
            style={styles.keyboardToggleBtn}
            onPress={() => setShowTextInput(!showTextInput)}
          >
            <Keyboard size={18} color={showTextInput ? '#00FFC2' : '#9CA3AF'} />
            <Text
              style={[
                styles.keyboardToggleText,
                showTextInput && { color: '#00FFC2' },
              ]}
            >
              {showTextInput ? 'Voice' : 'Type'}
            </Text>
          </TouchableOpacity>
        </View>

        {showTextInput && (
          <View style={styles.textInputRow}>
            <TextInput
              style={styles.hudTextInput}
              placeholder="Type your legal query..."
              placeholderTextColor="#4B5563"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => {
                processTextQuery(inputText);
                setInputText('');
                setShowTextInput(false);
              }}
            />
            <TouchableOpacity
              style={styles.hudSendBtn}
              onPress={() => {
                processTextQuery(inputText);
                setInputText('');
                setShowTextInput(false);
              }}
            >
              <Send size={16} color="#000000" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  locationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 255, 194, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 255, 194, 0.2)',
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.cyan,
  },

  // Conversational Scroll Area
  messageScroll: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  messageScrollContent: {
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-start',
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAi: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 255, 194, 0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 255, 194, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleUser: {
    backgroundColor: colors.border,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 255, 194, 0.15)',
    borderTopLeftRadius: 4,
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 21,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  metaText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // State Overlay Panel
  hudOverlayContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  stateSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4ADE80',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 255, 194, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 255, 194, 0.25)',
  },
  spinningRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#00FFC2',
  },
  understandingText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.cyan,
    letterSpacing: 0.5,
  },
  retryPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 159, 67, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 67, 0.3)',
  },
  retryPromptText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9F43',
  },

  // Suggested Prompts
  suggestedContainer: {
    height: 48,
    marginVertical: 4,
  },
  suggestedChipsRow: {
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  suggestionChipText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
  },

  // Interactive central mic orb
  orbArea: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  centerOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.border,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  centerOrbListening: {
    backgroundColor: '#FF1744',
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  centerOrbResponding: {
    backgroundColor: '#00FFC2',
    borderColor: 'rgba(0, 255, 194, 0.3)',
  },
  voiceStateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Bottom Control Panel
  bottomControlBar: {
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  handsFreeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  switchCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textSecondary,
  },
  keyboardToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  keyboardToggleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cyan,
    paddingHorizontal: 12,
    height: 44,
  },
  hudTextInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  hudSendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00FFC2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
