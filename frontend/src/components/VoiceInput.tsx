/**
 * VoiceInput - Microphone button for voice recording
 *
 * HOW IT WORKS:
 * 1. User presses and holds the mic button
 * 2. Recording starts immediately (button turns red)
 * 3. User releases the button to stop recording
 * 4. Audio file path is sent to parent component
 * 5. Parent sends audio to Python backend for Whisper transcription
 *
 * PERMISSIONS:
 * Requests microphone permission on first use.
 * Shows alert if permission is denied.
 */
import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Mic } from 'lucide-react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { getAudioPath } from '../utils/audioPath';
import { useMemo } from 'react';
import { useThemeColors } from '../context/ThemeContext';

// Single instance of the audio recorder (deferred to avoid native crash at module load)
let audioRecorderPlayer: AudioRecorderPlayer | null = null;
function getAudioRecorder(): AudioRecorderPlayer {
  if (!audioRecorderPlayer) {
    audioRecorderPlayer = new AudioRecorderPlayer();
  }
  return audioRecorderPlayer;
}

interface VoiceInputProps {
  onVoiceInput: (audioUri: string) => void; // Callback with audio file path
}

export const VoiceInput = ({ onVoiceInput }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /**
   * Request microphone permission from the user
   */
  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'DriveLegal needs access to your microphone for voice input.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS handles permissions differently
  };

  /**
   * Start recording audio
   * Called when user presses the mic button
   */
  const startRecording = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Microphone access is required for voice input.',
        );
        return;
      }

      // Start recording to a temporary file
      await getAudioRecorder().startRecorder();
      setIsRecording(true); // Turn button red to show recording state
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  /**
   * Stop recording and send audio file to parent
   * Called when user releases the mic button
   */
  const stopRecording = async () => {
    try {
      const rawPath = await getAudioRecorder().stopRecorder();
      setIsRecording(false);

      const path = getAudioPath(rawPath);
      if (path && path !== 'cancelled') {
        onVoiceInput(path);
      }
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isRecording && styles.buttonRecording]}
      onPressIn={startRecording} // Start on press down
      onPressOut={stopRecording} // Stop on press up
      delayLongPress={100}
    >
      <Mic
        size={22}
        color={isRecording ? colors.white : colors.textSecondary}
      />
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRecording: {
    backgroundColor: colors.error,
  },
});
