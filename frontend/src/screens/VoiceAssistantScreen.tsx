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
  Alert,
  Platform,
  PermissionsAndroid,
  Switch,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';
import { useLocation } from '../context/LocationContext';
import { getStateName, getJurisdictionLabel } from '../services/locationService';
import { executeQuery } from '../services/pythonBridge';
import { Mic, X, Sparkles, Volume2, Shield, Circle, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { getAudioPath } from '../utils/audioPath';

const { width } = Dimensions.get('window');

// Native TTS bridge reference
const { DriveLegalTTS } = NativeModules;

// Audio recorder player instance
const audioRecorderPlayer = new AudioRecorderPlayer();

// Driving safe quick commands
const QUICK_COMMANDS = [
  { text: 'Can I park here?', query: 'Can I park here?' },
  { text: 'Helmet fine?', query: 'What is the fine for driving without a helmet?' },
  { text: 'Speed limit?', query: 'What is the speed limit here?' },
  { text: 'Charging rules?', query: 'What are the rules and penalties for EV charging zones?' },
];

type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export const VoiceAssistantScreen = ({ navigation }: any) => {
  const userState = useSelector((state: RootState) => state.settings.state);
  const userLanguage = useSelector((state: RootState) => state.settings.language) || 'en';
  const { location, geoInfo } = useLocation();

  // Voice Interaction States
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [userTranscript, setUserTranscript] = useState('');
  const [botResponseText, setBotResponseText] = useState('Tap the mic and speak, or tap a quick card below.');
  const [isHandsFree, setIsHandsFree] = useState(true);

  // Animations
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;
  const spinAngle = useRef(new Animated.Value(0)).current;
  const soundWaveHeight = useRef(new Animated.Value(0)).current;

  // Timers and Refs
  const recordingTimer = useRef<any>(null);
  const isSpeakingCheckInterval = useRef<any>(null);

  // Continuous rotating spin animation for Thinking state
  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    if (voiceState === 'THINKING') {
      spinAngle.setValue(0);
      animation = Animated.loop(
        Animated.timing(spinAngle, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [voiceState]);

  // Breathing and glowing pulse animations for mic/speakers
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation;
    let glowLoop: Animated.CompositeAnimation;

    if (voiceState === 'LISTENING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.14, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.15, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
      glowLoop.start();
    } else if (voiceState === 'SPEAKING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.08, duration: 850, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1.0, duration: 850, useNativeDriver: true }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.45, duration: 850, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.1, duration: 850, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
      glowLoop.start();
    } else {
      // IDLE breathing
      pulseScale.setValue(1);
      glowOpacity.setValue(0.15);
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.03, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1.0, duration: 2000, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
      if (glowLoop) glowLoop.stop();
    };
  }, [voiceState]);

  // Clean up speech output on unmount
  useEffect(() => {
    return () => {
      stopSpeechPlayback();
      clearSpeechMonitoring();
    };
  }, []);

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
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'DriveSafe Voice assistant needs access to your microphone for hands-free queries.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  /**
   * Action: Microphone Press down to start speech capture
   */
  const handleMicrophoneAction = async () => {
    // Interruption handling: If speaking, tapping the orb stops playback and goes to idle
    if (voiceState === 'SPEAKING') {
      await stopSpeechPlayback();
      clearSpeechMonitoring();
      setVoiceState('IDLE');
      setBotResponseText('Speech paused. Tap to ask anything.');
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
        Alert.alert('Permission Denied', 'Audio recording permission is required for voice mode.');
        return;
      }

      await stopSpeechPlayback();
      clearSpeechMonitoring();

      setVoiceState('LISTENING');
      setUserTranscript('Listening...');
      setBotResponseText('');

      // Start capture
      await audioRecorderPlayer.startRecorder();

      // VAD safety: Auto-stop recording after 6 seconds to prevent massive files
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      recordingTimer.current = setTimeout(() => {
        stopAudioRecording();
      }, 6000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setVoiceState('IDLE');
      setBotResponseText('Could not access microphone.');
    }
  };

  const stopAudioRecording = async () => {
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }

    try {
      const rawPath = await audioRecorderPlayer.stopRecorder();
      setVoiceState('THINKING');
      setUserTranscript('Processing audio...');

      const path = getAudioPath(rawPath);
      if (path && path !== 'cancelled') {
        processVoiceQuery(path);
      } else {
        setVoiceState('IDLE');
        setUserTranscript('');
        setBotResponseText('Recording cancelled.');
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
      setVoiceState('IDLE');
    }
  };

  /**
   * Pipeline Step: Process Audio File URI using offline Python Whisper STT + RAG database
   */
  const processVoiceQuery = async (audioPath: string) => {
    try {
      // Execute Chaquopy SQLite FAISS bridging pipeline passing the audio path
      const result = await executeQuery({
        action: 'query',
        audio_uri: audioPath,
        language: userLanguage,
        location: {
          lat: location?.latitude || 0,
          lng: location?.longitude || 0,
          state: userState,
          city: geoInfo?.city || undefined,
          district: geoInfo?.district || undefined,
        }
      });

      if (result.status === 'success') {
        const textResponse = result.response_text || result.fallback_response_text || 'No matches found in database.';
        
        // Log transcription
        if ((result as any).transcription) {
          setUserTranscript(`"${(result as any).transcription}"`);
        } else {
          setUserTranscript('Voice Query Processed');
        }

        speakBotResponse(textResponse);
      } else {
        setVoiceState('IDLE');
        setBotResponseText("I couldn't transcribe the speech. Please speak clearly or tap a card.");
      }
    } catch (e) {
      console.error('Failed to execute bridge voice query:', e);
      setVoiceState('IDLE');
      setBotResponseText('Pipeline error. Please try again.');
    }
  };

  /**
   * Pipeline Step: Process Quick-Tap commands directly
   */
  const processQuickCommand = async (query: string) => {
    try {
      await stopSpeechPlayback();
      clearSpeechMonitoring();

      setVoiceState('THINKING');
      setUserTranscript(`"${query}"`);
      setBotResponseText('Searching laws...');

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
        }
      });

      if (result.status === 'success') {
        const textResponse = result.response_text || result.fallback_response_text || 'No matches found.';
        speakBotResponse(textResponse);
      } else {
        setVoiceState('IDLE');
        setBotResponseText('Search error.');
      }
    } catch (e) {
      console.error('Failed to run quick command:', e);
      setVoiceState('IDLE');
    }
  };

  /**
   * Text-to-Speech playback using Native JVM TTS module
   */
  const speakBotResponse = async (text: String) => {
    try {
      // 1. Speak using native Android engine instantly
      setVoiceState('SPEAKING');
      setBotResponseText(text as string);

      if (DriveLegalTTS) {
        await DriveLegalTTS.speak(text, userLanguage);

        // 2. Poll isSpeaking to detect completion and trigger hands-free auto-mic loop
        clearSpeechMonitoring();
        isSpeakingCheckInterval.current = setInterval(async () => {
          if (DriveLegalTTS) {
            const speaking = await DriveLegalTTS.isSpeaking();
            if (!speaking) {
              clearSpeechMonitoring();
              setVoiceState('IDLE');
              
              // Hands-Free Loop Trigger: automatically reactivate recording after 1.8s silence
              if (isHandsFree) {
                setTimeout(() => {
                  startAudioRecording();
                }, 1800);
              }
            }
          }
        }, 300);
      } else {
        // Fallback for mock/simulator missing modules
        setVoiceState('IDLE');
        Alert.alert('TTS Not Supported', 'Native TTS engine is not available on this platform.');
      }
    } catch (e) {
      console.error('TTS playback failure:', e);
      setVoiceState('IDLE');
    }
  };

  // Interpolate rotating thinking spinner angle
  const spin = spinAngle.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Driving-Safe HUD Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          stopSpeechPlayback();
          clearSpeechMonitoring();
          navigation.goBack();
        }}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Shield size={16} color={COLORS.cyan} />
          <Text style={styles.headerText}>VOICE COPILOT</Text>
        </View>
        <View style={styles.locationBadge}>
          <Text style={styles.locationBadgeText}>
            {geoInfo ? getJurisdictionLabel(geoInfo) : getStateName(userState)}
          </Text>
        </View>
      </View>

      {/* Massive Visual Display Area */}
      <View style={styles.hudDisplayContainer}>
        {/* User Question Transcript (Huge driving-safe text) */}
        {userTranscript.length > 0 && (
          <Text style={styles.userTranscriptText} numberOfLines={2}>
            {userTranscript}
          </Text>
        )}

        {/* Bot Response readout (Massive contrast text) */}
        <ScrollView 
          style={styles.responseScroll}
          contentContainerStyle={styles.responseScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[
            styles.botResponseText,
            voiceState === 'THINKING' && { color: COLORS.textSecondary, fontStyle: 'italic' }
          ]}>
            {botResponseText}
          </Text>
        </ScrollView>
      </View>

      {/* AI Pulse Orb / Mic Button */}
      <View style={styles.orbArea}>
        <Animated.View style={[
          styles.glowCircle,
          { 
            opacity: glowOpacity,
            transform: [{ scale: pulseScale }]
          },
          voiceState === 'LISTENING' && { backgroundColor: COLORS.error },
          voiceState === 'SPEAKING' && { backgroundColor: COLORS.cyan },
          voiceState === 'THINKING' && { backgroundColor: COLORS.primary },
        ]} />

        {/* Rotator ring for Thinking state */}
        {voiceState === 'THINKING' && (
          <Animated.View style={[
            styles.spinningRing,
            { transform: [{ rotate: spin }] }
          ]} />
        )}

        {/* Center Orb Card */}
        <TouchableOpacity
          onPress={handleMicrophoneAction}
          style={[
            styles.centerOrb,
            voiceState === 'LISTENING' && styles.centerOrbListening,
            voiceState === 'SPEAKING' && styles.centerOrbSpeaking,
            voiceState === 'THINKING' && styles.centerOrbThinking,
          ]}
          activeOpacity={0.9}
        >
          {voiceState === 'LISTENING' ? (
            <Circle size={28} color={COLORS.white} />
          ) : voiceState === 'THINKING' ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : voiceState === 'SPEAKING' ? (
            <Volume2 size={32} color={COLORS.white} />
          ) : (
            <Mic size={32} color={COLORS.white} />
          )}
        </TouchableOpacity>

        {/* Voice State subtitle */}
        <Text style={styles.voiceStateSub}>
          {voiceState === 'LISTENING' ? '🔴 LISTENING (Tap to end)' :
           voiceState === 'THINKING' ? '⚡ TRANSCRIBING LAWS...' :
           voiceState === 'SPEAKING' ? '🔊 BOT SPEAKING (Tap to mute)' :
           '🎤 TAP MIC TO SPEAK'}
        </Text>
      </View>

      {/* Driving-safe HUD Quick Tap Cards */}
      <View style={styles.hudFooterContainer}>
        {/* Hands-Free loop switch */}
        <View style={styles.handsFreeBar}>
          <Text style={styles.handsFreeLabel}>Auto-Listen Loop (Hands-Free)</Text>
          <Switch
            value={isHandsFree}
            onValueChange={setIsHandsFree}
            trackColor={{ false: COLORS.border, true: 'rgba(6, 182, 212, 0.3)' }}
            thumbColor={isHandsFree ? COLORS.cyan : '#f4f3f4'}
          />
        </View>

        <Text style={styles.quickCommandsTitle}>Driving Quick-Taps</Text>
        
        <View style={styles.quickCommandsGrid}>
          {QUICK_COMMANDS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickCommandCard}
              onPress={() => processQuickCommand(item.query)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickCommandText} numberOfLines={1}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  locationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    ...GLASS.light,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.cyan,
  },

  // Huge Driving HUD Display
  hudDisplayContainer: {
    flex: 1.1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
    justifyContent: 'flex-start',
  },
  userTranscriptText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.cyan,
    lineHeight: 28,
  },
  responseScroll: {
    flex: 1,
  },
  responseScrollContent: {
    paddingBottom: 20,
  },
  botResponseText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 38,
  },

  // Visual Interactive AI Orb Area
  orbArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: COLORS.cyan,
  },
  spinningRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: COLORS.cyan,
    borderRightColor: 'rgba(6, 182, 212, 0.3)',
  },
  centerOrb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.glow('rgba(255, 255, 255, 0.1)'),
  },
  centerOrbListening: {
    backgroundColor: COLORS.error,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    ...SHADOWS.glow(COLORS.error),
  },
  centerOrbSpeaking: {
    backgroundColor: COLORS.cyan,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    ...SHADOWS.glow(COLORS.cyan),
  },
  centerOrbThinking: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(37, 99, 235, 0.4)',
    ...SHADOWS.glow(COLORS.primary),
  },
  voiceStateSub: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 18,
    letterSpacing: 1.5,
  },

  // Safe HUD footer with quick-tap cards
  hudFooterContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 12,
  },
  handsFreeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  handsFreeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  quickCommandsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  quickCommandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCommandCard: {
    width: '48%', // 2 columns
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCommandText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
});
