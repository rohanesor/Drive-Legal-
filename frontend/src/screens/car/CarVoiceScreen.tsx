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
  Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useLocation } from '../../context/LocationContext';
import { useAppMode } from '../../hooks/useAppMode';
import { executeQuery } from '../../services/pythonBridge';
import { CAR_COLORS, CAR_TYPOGRAPHY, CAR_SPACING } from '../../constants/theme';
import { Mic, ArrowLeft, Volume2, Circle, AlertCircle } from 'lucide-react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { getAudioPath } from '../../utils/audioPath';

const { DriveLegalTTS } = NativeModules;
const audioRecorderPlayer = new AudioRecorderPlayer();

type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export const CarVoiceScreen = () => {
  const navigation = useNavigation();
  const userState = useSelector((state: RootState) => state.settings.state);
  const userLanguage = useSelector((state: RootState) => state.settings.language) || 'en';
  const { location, geoInfo } = useLocation();
  const { preferences } = useAppMode();

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [userTranscript, setUserTranscript] = useState('');
  const [botResponseText, setBotResponseText] = useState('TRAFIAI ACTIVE\nTap the mic and speak.');

  // Timing refs
  const recordingTimer = useRef<any>(null);
  const isSpeakingCheckInterval = useRef<any>(null);

  // Simple clean animation values
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;

  // Pulse loop for visual state feedback
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation;
    let glowLoop: Animated.CompositeAnimation;

    if (voiceState === 'LISTENING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.15, duration: 600, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(pulseScale, { toValue: 1.0, duration: 600, useNativeDriver: true, easing: Easing.ease }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.15, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
      glowLoop.start();
    } else if (voiceState === 'SPEAKING') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.08, duration: 800, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(pulseScale, { toValue: 1.0, duration: 800, useNativeDriver: true, easing: Easing.ease }),
        ])
      );
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
      glowLoop.start();
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
      if (glowLoop) glowLoop.stop();
    };
  }, [voiceState]);

  // Clean playback on unmount/screen blur
  useEffect(() => {
    // Autostart voice assistant if configured
    if (preferences.autoVoice) {
      setTimeout(() => {
        startRecordingFlow();
      }, 500);
    }

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

  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Access',
          message: 'TrafiAI needs microphone access to listen to driver voice queries.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
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
      if (!hasPermission) return;

      await stopSpeechPlayback();
      clearSpeechMonitoring();

      setVoiceState('LISTENING');
      setUserTranscript('LISTENING...');
      setBotResponseText('');

      await audioRecorderPlayer.startRecorder();

      // Autostop recording after 4.5 seconds for driving safety
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      recordingTimer.current = setTimeout(() => {
        stopRecordingFlow();
      }, 4500);

    } catch (err) {
      console.error('Recording start failure:', err);
      setVoiceState('IDLE');
      setBotResponseText('Mic Error.');
    }
  };

  const stopRecordingFlow = async () => {
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }

    try {
      const rawPath = await audioRecorderPlayer.stopRecorder();
      setVoiceState('THINKING');
      setUserTranscript('THINKING...');

      const path = getAudioPath(rawPath);
      if (path && path !== 'cancelled') {
        processVoiceHeuristics(path);
      } else {
        setVoiceState('IDLE');
        setBotResponseText('Recording cancelled.');
      }
    } catch (err) {
      console.error('Recording stop failure:', err);
      setVoiceState('IDLE');
    }
  };

  const processVoiceHeuristics = async (audioPath: string) => {
    try {
      // Execute the voice bridge query with high performance parameters
      const result = await executeQuery({
        action: 'query',
        audio_uri: audioPath,
        language: userLanguage,
        concise_mode: true, // Request automotive short answers
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
        
        if ((result as any).transcription) {
          setUserTranscript(`"${(result as any).transcription}"`);
        } else {
          setUserTranscript('Query Processed');
        }

        speakResponse(textResponse);
      } else {
        setVoiceState('IDLE');
        setBotResponseText('Did not catch that. Tap to retry.');
      }
    } catch (e) {
      console.error('Voice processing failure:', e);
      setVoiceState('IDLE');
      setBotResponseText('Network / DB Error.');
    }
  };

  const speakResponse = async (text: string) => {
    try {
      setVoiceState('SPEAKING');
      
      // Enforce driving-safe absolute maximum string boundary of 90 characters
      const conciseText = text.length > 90 
        ? text.substring(0, 87) + '...' 
        : text;

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
        <Text style={styles.headerTitle}>TrafiAI VOICE</Text>
        <View style={styles.spacer} />
      </View>

      {/* Displays user speech query and answers */}
      <View style={styles.displayArea}>
        {userTranscript.length > 0 && (
          <Text style={styles.transcriptText} numberOfLines={1}>
            {userTranscript}
          </Text>
        )}
        <Text style={styles.botText}>
          {botResponseText}
        </Text>
      </View>

      {/* Premium Visual Voice Orb HUD */}
      <View style={styles.orbContainer}>
        <Animated.View style={[
          styles.pulseGlow,
          { 
            opacity: glowOpacity,
            transform: [{ scale: pulseScale }]
          },
          voiceState === 'LISTENING' && { backgroundColor: CAR_COLORS.danger },
          voiceState === 'SPEAKING' && { backgroundColor: CAR_COLORS.accent },
          voiceState === 'THINKING' && { backgroundColor: CAR_COLORS.success },
        ]} />

        <TouchableOpacity 
          style={[
            styles.touchOrb,
            voiceState === 'LISTENING' && { backgroundColor: CAR_COLORS.danger },
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
            <Mic size={44} color={voiceState === 'LISTENING' ? '#FFFFFF' : '#000000'} />
          )}
        </TouchableOpacity>

        <Text style={styles.stateSubtitle}>
          {voiceState === 'LISTENING' ? '🔴 LISTENING...' :
           voiceState === 'THINKING' ? '⚡ TRANSLATING...' :
           voiceState === 'SPEAKING' ? '🔊 BOT SPEAKING' :
           '🎤 TAP TO ASK'}
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
    width: 120,
    height: 120,
    borderRadius: 60,
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
});

export default CarVoiceScreen;
