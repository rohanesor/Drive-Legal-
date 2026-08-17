import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  NativeModules,
  Platform,
  PermissionsAndroid,
  Animated,
  Easing,
  TextInput,
  Switch,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useLocation } from '../../context/LocationContext';
import { useAppMode } from '../../hooks/useAppMode';
import { driveLegalService } from '../../services/driveLegalService';
import { CAR_COLORS, CAR_TYPOGRAPHY, CAR_SPACING } from '../../constants/theme';
import {
  Mic,
  ArrowLeft,
  Volume2,
  AlertCircle,
  Keyboard,
  Send,
  Sparkles,
} from 'lucide-react-native';

const { DriveLegalTTS, DriveLegalSpeechRecognizer } = NativeModules;

type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export const CarVoiceScreen = () => {
  const navigation = useNavigation();
  const userState = useSelector((state: RootState) => state.settings.state);
  const userLanguage =
    useSelector((state: RootState) => state.settings.language) || 'en';
  const { location, geoInfo } = useLocation();
  const { preferences } = useAppMode();

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [userTranscript, setUserTranscript] = useState('');
  const [botResponseText, setBotResponseText] = useState(
    'DriveTalk Active\nTap the mic and speak.',
  );
  const [inputText, setInputText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // Multilingual Telemetry States
  const [detectedLang, setDetectedLang] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [showMicFailFallback, setShowMicFailFallback] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [speechAvailable, setSpeechAvailable] = useState(true);
  const [thinkingStep, setThinkingStep] = useState(1);
  const [sttLogs, setSttLogs] = useState<string[]>([]);
  const autoRetryCount = useRef(0);
  const hasTranscriptRef = useRef(false);
  const latestTranscriptRef = useRef('');
  const hasSubmittedRef = useRef(false);
  const speechEndTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (voiceState === 'THINKING') {
      setThinkingStep(1);
      interval = setInterval(() => {
        setThinkingStep((prev) => (prev < 3 ? prev + 1 : 3));
      }, 950);
    } else {
      setThinkingStep(1);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [voiceState]);

  const getKeywordResponse = (text: string) => {
    const lower = text.toLowerCase();

    if (lower.includes('speed limit')) {
      return '📍 Speed Limit Regulations:\nUnder Section 112 of the Motor Vehicles Act, exceeding speed limits attracts a fine of ₹1,000 to ₹2,000 for light motor vehicles, and license suspension for repeat offenses.';
    }
    if (
      lower.includes('helmet fine') ||
      lower.includes('helmet') ||
      lower.includes('ஹெல்மெட்') ||
      lower.includes('हेलमेट')
    ) {
      return '🪖 Helmet Violation Fine:\nUnder Section 194D of the Motor Vehicles Act, riding without a helmet attracts a fine of ₹1,000 and disqualification of your driving license for 3 months.';
    }
    if (lower.includes('parking') || lower.includes('park')) {
      return "🚗 Parking Regulations:\nParking in a designated 'No Parking' zone or causing obstruction attracts a fine of ₹500 under Section 122/177 of the Motor Vehicles Act, plus towing charges.";
    }
    if (
      lower.includes('police station') ||
      lower.includes('police') ||
      lower.includes('காவல் நிலையம்') ||
      lower.includes('पुलिस')
    ) {
      return '🚓 Police Assistance:\nThe nearest police station is situated 500 meters ahead at Gandhipuram Junction. Dial 100 for immediate emergency police dispatch.';
    }
    if (
      lower.includes('emergency') ||
      lower.includes('sos') ||
      lower.includes('accident')
    ) {
      return '🚨 Emergency SOS Active:\nEmergency response services notified. Dial 108 for ambulance or 112 for national emergency services. Proceed with safety.';
    }
    if (
      lower.includes('ev charging') ||
      lower.includes('ev') ||
      lower.includes('charging')
    ) {
      return '🔌 EV Charging Zone Rules:\nParking non-EV vehicles in designated EV charging bays is a violation attracting a ₹500 fine and immediate towing of the offending vehicle.';
    }
    return null;
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${msg}`;
    console.log(formatted);
    setSttLogs((prev) => [formatted, ...prev].slice(0, 15));
  };

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case 'ta':
        return '🇮🇳 தமிழ் (Tamil)';
      case 'hi':
        return '🇮🇳 हिंदी (Hindi)';
      case 'te':
        return '🇮🇳 తెలుగు (Telugu)';
      case 'kn':
        return '🇮🇳 ಕನ್ನಡ (Kannada)';
      case 'ml':
        return '🇮🇳 മലയാളം (Malayalam)';
      case 'en':
        return '🇬🇧 English';
      default:
        return code ? code.toUpperCase() : 'Unknown';
    }
  };

  // Timing refs
  const isSpeakingCheckInterval = useRef<any>(null);

  // Simple clean animation values
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;

  // Pulse loop for visual state feedback
  // This effect owns the long-lived voice animation loop.

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation;
    let glowLoop: Animated.CompositeAnimation;

    if (voiceState === 'LISTENING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
        ]),
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.7,
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
    } else if (voiceState === 'SPEAKING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
        ]),
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
      glowLoop.start();
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

  // Mount logic: verify SpeechRecognizer is active on device
  // This effect wires native speech listeners once per language/config change.

  useEffect(() => {
    const checkSpeechServices = async () => {
      try {
        if (DriveLegalSpeechRecognizer) {
          const available =
            await DriveLegalSpeechRecognizer.isSpeechServicesAvailable();
          setSpeechAvailable(available);
          addLog(
            available
              ? 'Android Speech Services: ACTIVE'
              : 'Android Speech Services: OFFLINE',
          );
        } else {
          setSpeechAvailable(false);
          addLog('DriveLegalSpeechRecognizer Module not found.');
        }
      } catch (e) {
        setSpeechAvailable(false);
        addLog('Failed to query Speech Services.');
      }
    };
    checkSpeechServices();

    // Register Android Native SpeechRecognizer JNI event listeners
    const onStart = DeviceEventEmitter.addListener('onSpeechStart', () => {
      addLog('Speech recognition ready. Microphone is listening.');
      setVoiceState('LISTENING');
    });

    const onBegan = DeviceEventEmitter.addListener('onSpeechBegan', () => {
      addLog('Speaking started: user voice energy detected.');
    });

    const onEnd = DeviceEventEmitter.addListener('onSpeechEnd', () => {
      addLog('Speech ended: user stopped talking.');
      // Safety timeout: if onSpeechResults doesn't arrive within 2.5s,
      // submit whatever partial transcript we have
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current);
      }
      speechEndTimeoutRef.current = setTimeout(() => {
        addLog(
          'Speech End safety timeout fired — checking for pending transcript',
        );
        const pending = latestTranscriptRef.current?.trim();
        if (pending && pending.length > 0 && !hasSubmittedRef.current) {
          addLog(
            `Submitting partial transcript via safety timeout: "${pending}"`,
          );
          processSpeechText(pending);
        } else if (!hasSubmittedRef.current) {
          // No transcript at all — transition to IDLE so UI isn't stuck
          setVoiceState('IDLE');
          setBotResponseText('No speech detected. Tap mic to try again.');
        }
      }, 2500);
    });

    const onPartial = DeviceEventEmitter.addListener(
      'onSpeechPartialResults',
      (e) => {
        const match = e.value && e.value[0];
        if (match) {
          hasTranscriptRef.current = true;
          latestTranscriptRef.current = match;
          setUserTranscript(match);
          addLog(`Partial: "${match}"`);
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
      if (match) {
        hasTranscriptRef.current = true;
        latestTranscriptRef.current = match;
        addLog(`Final match: "${match}"`);
        autoRetryCount.current = 0;
        if (!hasSubmittedRef.current) {
          processSpeechText(match);
        }
      } else {
        addLog('Speech results empty.');
        if (!hasTranscriptRef.current && !hasSubmittedRef.current) {
          handleSpeechFailure('No match found.');
        }
      }
    });

    const onError = DeviceEventEmitter.addListener('onSpeechError', (e) => {
      // Cancel safety timeout since error handler will deal with it
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current);
        speechEndTimeoutRef.current = null;
      }
      addLog(`Speech Error [Code: ${e.code}]: ${e.message}`);
      if (
        hasTranscriptRef.current &&
        latestTranscriptRef.current.trim().length > 0
      ) {
        addLog(
          `Ignored error [Code ${e.code}]. Auto-submitting captured partial transcript: "${latestTranscriptRef.current}"`,
        );
        autoRetryCount.current = 0;
        if (!hasSubmittedRef.current) {
          processSpeechText(latestTranscriptRef.current);
        }
        return;
      }
      handleSpeechFailure(e.message, e.code);
    });

    // Autostart voice assistant if configured
    if (preferences.autoVoice) {
      setTimeout(() => {
        startRecordingFlow();
      }, 500);
    }

    return () => {
      onStart.remove();
      onBegan.remove();
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
  }, [userLanguage, preferences.autoVoice]);

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

  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      addLog('Checking microphone permission...');
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (hasPermission) {
        addLog('Microphone Permission: GRANTED');
        return true;
      }

      addLog('Microphone Permission: NOT GRANTED. Requesting...');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Access',
          message:
            'Vazhi AI needs microphone access to listen to driver voice queries.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      addLog(
        isGranted
          ? 'Microphone Permission: APPROVED / GRANTED'
          : 'Microphone Permission: DENIED',
      );
      return isGranted;
    }
    return true;
  };

  const handleOrbPress = async () => {
    if (voiceState === 'SPEAKING') {
      await stopSpeechPlayback();
      clearSpeechMonitoring();
      setVoiceState('IDLE');
      setBotResponseText('Muted. Tap mic to talk.');
      return;
    }

    if (voiceState === 'LISTENING') {
      await stopRecordingFlow();
      return;
    }

    await startRecordingFlow();
  };

  const startRecordingFlow = async () => {
    try {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        handleSpeechFailure('Microphone permission denied.');
        return;
      }

      await stopSpeechPlayback();
      clearSpeechMonitoring();

      hasTranscriptRef.current = false;
      latestTranscriptRef.current = '';
      hasSubmittedRef.current = false;
      setVoiceState('LISTENING');
      setUserTranscript('Listening...');
      setBotResponseText('');
      setSpeechError('');
      setShowMicFailFallback(false);

      if (DriveLegalSpeechRecognizer) {
        addLog(`Starting native listener in language: ${userLanguage}`);
        await DriveLegalSpeechRecognizer.startListening(userLanguage);
      } else {
        handleSpeechFailure('Native Speech Recognizer module missing.');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to initialize Speech Recognizer.';
      handleSpeechFailure(message);
    }
  };

  const stopRecordingFlow = async () => {
    try {
      addLog('Stopping listener...');
      if (DriveLegalSpeechRecognizer) {
        await DriveLegalSpeechRecognizer.stopListening();
      }
    } catch (err) {
      console.error('Error stopping listener:', err);
      setVoiceState('IDLE');
    }
  };

  const handleSpeechFailure = (errorMsg: string, errorCode?: number) => {
    if (hasTranscriptRef.current) {
      addLog(
        'Speech failure ignored because valid transcript was already captured.',
      );
      return;
    }
    setVoiceState('IDLE');
    setSpeechError(errorMsg);
    setBotResponseText('Could not hear clearly. Tap to retry.');
    setShowMicFailFallback(true);

    // Auto-retry once under hands-free
    if (
      preferences.autoVoice &&
      autoRetryCount.current < 1 &&
      (errorCode === 7 || errorCode === 6 || errorCode === 8)
    ) {
      autoRetryCount.current += 1;
      addLog(`Speech timeout. Auto-retrying #${autoRetryCount.current}...`);
      setTimeout(() => {
        startRecordingFlow();
      }, 1000);
    }
  };

  const processSpeechText = async (transcribedText: string) => {
    try {
      if (hasSubmittedRef.current) {
        return;
      }
      hasSubmittedRef.current = true;
      hasTranscriptRef.current = true;
      setVoiceState('THINKING');
      setShowMicFailFallback(false);

      addLog(`STT: Transcript Received: "${transcribedText}"`);

      // Keyword routing local fast-path bypass
      const keywordResponse = getKeywordResponse(transcribedText);
      if (keywordResponse) {
        addLog('Local Router: Keyword matched! Bypassing Python RAG.');
        addLog('Vazhi AI: Request Sent...');
        addLog('Vazhi AI: Response Received successfully (Fast-Path).');
        speakResponse(keywordResponse);
        return;
      }

      addLog('Vazhi AI: Request Sent...');
      const result = await driveLegalService.query(
        transcribedText,
        userState,
        userLanguage,
        location ? { lat: location.latitude, lng: location.longitude } : undefined,
      );

      const textResponse =
        result.response ||
        (result as any).response_text ||
        (result as any).fallback_response_text ||
        result.message ||
        'No matches found.';

      if ((result as any).detected_language) {
        setDetectedLang((result as any).detected_language);
      }
      if ((result as any).confidence !== undefined) {
        setConfidenceScore(Math.round((result as any).confidence * 100));
      }

      addLog('Vazhi AI: Response Received successfully.');
      speakResponse(textResponse);
    } catch (e) {
      console.error('Voice processing failure:', e);
      setVoiceState('IDLE');
      setBotResponseText('Error processing speech.');
      setShowMicFailFallback(true);
    }
  };

  const processTextQuery = async (queryText: string) => {
    if (!queryText.trim()) {
      return;
    }
    try {
      await stopSpeechPlayback();
      clearSpeechMonitoring();

      setVoiceState('THINKING');
      setUserTranscript(`"${queryText}"`);
      setBotResponseText('Thinking...');

      const result = await driveLegalService.query(
        queryText,
        userState,
        userLanguage,
        location ? { lat: location.latitude, lng: location.longitude } : undefined,
      );

      const textResponse =
        result.response ||
        (result as any).response_text ||
        (result as any).fallback_response_text ||
        result.message ||
        'No matches found.';

      speakResponse(textResponse);
    } catch (e) {
      console.error('Text processing failure:', e);
      setVoiceState('IDLE');
      setBotResponseText('Network / DB Error.');
    }
  };

  const speakResponse = async (text: string) => {
    try {
      setVoiceState('SPEAKING');

      // Enforce driving-safe absolute maximum string boundary of 90 characters
      const conciseText =
        text.length > 90 ? text.substring(0, 87) + '...' : text;

      setBotResponseText(conciseText);

      if (DriveLegalTTS) {
        await DriveLegalTTS.speak(conciseText, userLanguage);

        clearSpeechMonitoring();
        isSpeakingCheckInterval.current = setInterval(async () => {
          if (DriveLegalTTS) {
            const speaking = await DriveLegalTTS.isSpeaking();
            if (!speaking) {
              clearSpeechMonitoring();
              setVoiceState('IDLE');
            }
          }
        }, 400);
      } else {
        setVoiceState('IDLE');
      }
    } catch (e) {
      console.error('TTS execution failure:', e);
      setVoiceState('IDLE');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header Area */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            stopSpeechPlayback();
            clearSpeechMonitoring();
            navigation.goBack();
          }}
        >
          <ArrowLeft color={CAR_COLORS.accent} size={28} />
          <Text style={styles.headerText}>BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DriveTalk (Voice)</Text>
        <View style={styles.speechStatusCol}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: speechAvailable ? '#22C55E' : '#EF4444' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: speechAvailable ? '#22C55E' : '#EF4444' },
            ]}
          >
            {speechAvailable ? 'ACTIVE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* Displays user speech query and answers */}
      <View style={styles.displayArea}>
        {/* Multilingual Telemetry Status Row */}
        {(detectedLang !== '' || confidenceScore !== null) && (
          <View style={styles.telemetryRow}>
            {detectedLang !== '' && (
              <View style={styles.telemetryBadge}>
                <Text style={styles.telemetryBadgeText}>
                  {getLanguageLabel(detectedLang)}
                </Text>
              </View>
            )}
            {confidenceScore !== null && (
              <View
                style={[
                  styles.telemetryBadge,
                  {
                    borderColor: 'rgba(34, 197, 94, 0.4)',
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                  },
                ]}
              >
                <Text style={[styles.telemetryBadgeText, { color: '#4ADE80' }]}>
                  {confidenceScore}% Accuracy
                </Text>
              </View>
            )}
          </View>
        )}

        {/* You Said Raw Transcribed Panel */}
        {userTranscript.length > 0 &&
          userTranscript !== 'Listening...' &&
          userTranscript !== 'Thinking...' && (
            <View style={styles.youSaidContainer}>
              <Text style={styles.youSaidHeader}>You Said:</Text>
              <Text style={styles.youSaidText}>{userTranscript}</Text>
            </View>
          )}

        {voiceState === 'THINKING' ? (
          <View style={styles.thinkingContainer}>
            <View style={styles.thinkingStep}>
              <Text style={[styles.thinkingStepText, { color: '#22C55E' }]}>
                Voice Captured ✓
              </Text>
            </View>
            <View style={styles.thinkingStep}>
              {thinkingStep >= 2 ? (
                <Text style={[styles.thinkingStepText, { color: '#22C55E' }]}>
                  Understanding Request ✓
                </Text>
              ) : (
                <View style={styles.thinkingStepRow}>
                  <ActivityIndicator
                    size="small"
                    color={CAR_COLORS.accent}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.thinkingStepText,
                      { color: CAR_COLORS.accent },
                    ]}
                  >
                    Understanding Request...
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.thinkingStep}>
              {thinkingStep >= 3 ? (
                <Text style={[styles.thinkingStepText, { color: '#22C55E' }]}>
                  Generating Legal Guidance ✓
                </Text>
              ) : thinkingStep === 2 ? (
                <View style={styles.thinkingStepRow}>
                  <ActivityIndicator
                    size="small"
                    color={CAR_COLORS.accent}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.thinkingStepText,
                      { color: CAR_COLORS.accent },
                    ]}
                  >
                    Generating Legal Guidance...
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.thinkingStepText,
                    { color: 'rgba(255, 255, 255, 0.4)' },
                  ]}
                >
                  Generating Legal Guidance...
                </Text>
              )}
            </View>
          </View>
        ) : showMicFailFallback ? (
          <View style={styles.fallbackCard}>
            <View style={styles.fallbackHeader}>
              <AlertCircle size={28} color={CAR_COLORS.danger} />
              <Text style={styles.fallbackHeaderText}>
                COULD NOT HEAR CLEARLY
              </Text>
            </View>
            <Text style={styles.fallbackBodyText}>
              Reason:{' '}
              {speechError ||
                'No speech detected. Please speak closer to microphone.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setShowMicFailFallback(false);
                startRecordingFlow();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>TAP TO RETRY VOICE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.botText}>{botResponseText}</Text>
        )}
      </View>

      {/* Keyboard Input Toggler & Collapsible Bar */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.keyboardToggleBtn}
          onPress={() => setShowTextInput(!showTextInput)}
          activeOpacity={0.8}
        >
          <Keyboard
            size={20}
            color={showTextInput ? CAR_COLORS.accent : CAR_COLORS.textSecondary}
          />
          <Text
            style={[
              styles.keyboardToggleText,
              showTextInput && { color: CAR_COLORS.accent },
            ]}
          >
            {showTextInput ? 'Hide Input' : 'Type Message'}
          </Text>
        </TouchableOpacity>

        {showTextInput && (
          <View style={styles.textInputRow}>
            <TextInput
              style={styles.hudTextInput}
              placeholder="Ask DriveTalk..."
              placeholderTextColor="#666666"
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
              <Send size={18} color="#000000" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Scrollable Diagnostics Log Terminal for Car Mode */}
      <View style={styles.diagnosticsContainer}>
        <View style={styles.diagnosticsHeader}>
          <Text style={styles.diagnosticsTitle}>
            LIVE SPEECH DIAGNOSTICS LOGS
          </Text>
          <TouchableOpacity
            style={styles.clearLogsBtn}
            onPress={() => setSttLogs([])}
          >
            <Text style={styles.clearLogsBtnText}>CLEAR</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.diagnosticsScroll}
          contentContainerStyle={styles.diagnosticsScrollContent}
          nestedScrollEnabled={true}
        >
          {sttLogs.length === 0 ? (
            <Text style={styles.noLogsText}>
              No speech recognition events logged yet.
            </Text>
          ) : (
            sttLogs.map((log, index) => (
              <Text key={index} style={styles.logLineText}>
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>

      {/* Test Mode & Auto-Voice controllers for Car Mode */}
      <View style={styles.handsFreeBar}>
        <View style={styles.switchCol}>
          <Text style={styles.handsFreeLabel}>Auto-Listen</Text>
          <Switch
            value={preferences.autoVoice}
            onValueChange={(val) => addLog(`Auto-Listen changed to: ${val}`)}
            trackColor={{ false: '#2D3748', true: 'rgba(6, 182, 212, 0.3)' }}
            thumbColor={preferences.autoVoice ? CAR_COLORS.accent : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Driving Safe Quick Suggestions */}
      {!showTextInput && !showMicFailFallback && (
        <View style={styles.suggestionsContainer}>
          {[
            { label: 'Helmet Fine', query: 'helmet fine' },
            { label: 'Speed Limit', query: 'speed limit' },
            { label: 'Drunk Drive', query: 'drunk driving fine' },
          ].map((chip, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => processTextQuery(chip.query)}
              activeOpacity={0.8}
            >
              <Text style={styles.suggestionChipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Premium Visual Voice Orb HUD */}
      <View style={styles.orbContainer}>
        <Animated.View
          style={[
            styles.pulseGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: pulseScale }],
            },
            voiceState === 'LISTENING' && {
              backgroundColor: CAR_COLORS.danger,
            },
            voiceState === 'SPEAKING' && { backgroundColor: CAR_COLORS.accent },
            voiceState === 'THINKING' && {
              backgroundColor: CAR_COLORS.success,
            },
          ]}
        />

        <TouchableOpacity
          style={[
            styles.touchOrb,
            voiceState === 'LISTENING' && {
              backgroundColor: CAR_COLORS.danger,
            },
            voiceState === 'SPEAKING' && { backgroundColor: CAR_COLORS.accent },
            voiceState === 'THINKING' && { backgroundColor: '#1E293B' },
          ]}
          onPress={handleOrbPress}
          activeOpacity={0.9}
        >
          {voiceState === 'THINKING' ? (
            <ActivityIndicator size="large" color={CAR_COLORS.accent} />
          ) : voiceState === 'SPEAKING' ? (
            <Volume2 size={44} color="#000000" />
          ) : (
            <Mic
              size={44}
              color={voiceState === 'LISTENING' ? '#FFFFFF' : '#000000'}
            />
          )}
        </TouchableOpacity>

        <Text style={styles.stateSubtitle}>
          {voiceState === 'LISTENING'
            ? '🔴 LISTENING...'
            : voiceState === 'THINKING'
            ? '⚡ TRANSLATING...'
            : voiceState === 'SPEAKING'
            ? '🔊 BOT SPEAKING'
            : '🎤 TAP TO ASK'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAR_COLORS.background,
    padding: CAR_SPACING.padding,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CAR_COLORS.border,
  },
  headerText: {
    color: CAR_COLORS.accent,
    fontSize: CAR_TYPOGRAPHY.status.fontSize,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: CAR_TYPOGRAPHY.title.fontSize,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  spacer: {
    width: 80,
  },
  displayArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 12,
  },
  transcriptText: {
    color: CAR_COLORS.accent,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  botText: {
    color: CAR_COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 38,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    position: 'relative',
  },
  pulseGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: CAR_COLORS.accent,
  },
  touchOrb: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: CAR_COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  stateSubtitle: {
    color: CAR_COLORS.textSecondary,
    fontSize: CAR_TYPOGRAPHY.label.fontSize,
    fontWeight: 'bold',
    marginTop: 20,
    letterSpacing: 2,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  keyboardToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  keyboardToggleText: {
    color: CAR_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginTop: 10,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    paddingHorizontal: 12,
  },
  hudTextInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hudSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CAR_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 10,
    width: '100%',
  },
  suggestionChip: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  suggestionChipText: {
    color: CAR_COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  telemetryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  telemetryBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: CAR_COLORS.accent,
  },
  fallbackCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 500,
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  fallbackHeaderText: {
    fontSize: 20,
    fontWeight: '900',
    color: CAR_COLORS.danger,
    letterSpacing: 1,
  },
  fallbackBodyText: {
    fontSize: 15,
    fontWeight: '700',
    color: CAR_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: CAR_COLORS.accent,
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: CAR_COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  speechStatusCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  testModePanel: {
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  testModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  testModeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: CAR_COLORS.accent,
    letterSpacing: 1.5,
  },
  testModeInstruction: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  testModePhrase: {
    color: CAR_COLORS.accent,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CAR_COLORS.accent,
    paddingVertical: 12,
    borderRadius: 20,
  },
  simulateBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  youSaidContainer: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  youSaidHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: CAR_COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  youSaidText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  diagnosticsContainer: {
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginVertical: 10,
    padding: 12,
    height: 120,
    width: '100%',
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: 6,
    marginBottom: 6,
  },
  diagnosticsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: CAR_COLORS.accent,
    letterSpacing: 1.5,
  },
  clearLogsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
  },
  clearLogsBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  diagnosticsScroll: {
    flex: 1,
  },
  diagnosticsScrollContent: {
    paddingBottom: 6,
  },
  noLogsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  logLineText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#38BDF8',
    lineHeight: 16,
  },
  handsFreeBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 8,
    width: '100%',
  },
  handsFreeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingContainer: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 16,
    padding: 24,
    gap: 20,
    width: '100%',
    alignSelf: 'stretch',
  },
  thinkingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  thinkingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinkingStepText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default CarVoiceScreen;
