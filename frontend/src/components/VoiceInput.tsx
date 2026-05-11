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
import Ionicons from 'react-native-vector-icons/Ionicons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

// Single instance of the audio recorder (shared across the app)
const audioRecorderPlayer = new AudioRecorderPlayer();

interface VoiceInputProps {
  onVoiceInput: (audioUri: string) => void; // Callback with audio file path
}

export const VoiceInput = ({ onVoiceInput }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);

  /**
   * Request microphone permission from the user
   */
  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'DriveLegal needs access to your microphone for voice input.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
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
        Alert.alert('Permission Denied', 'Microphone access is required for voice input.');
        return;
      }

      // Start recording to a temporary file
      const uri = await audioRecorderPlayer.startRecorder();
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
      const path = await audioRecorderPlayer.stopRecorder();
      setIsRecording(false); // Reset button to grey

      // Send audio file path to parent for transcription
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
      onPressIn={startRecording}  // Start on press down
      onPressOut={stopRecording}   // Stop on press up
      delayLongPress={100}
    >
      <Ionicons
        name={isRecording ? 'mic' : 'mic-outline'}
        size={22}
        color={isRecording ? '#ffffff' : '#6b7280'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6', // Grey when idle
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRecording: {
    backgroundColor: '#dc2626', // Red when recording
  },
});
