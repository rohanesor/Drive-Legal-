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
import { getAudioPath } from '../utils/audioPath';

const audioRecorderPlayer = new AudioRecorderPlayer();

interface VoiceInputProps {
  onVoiceInput: (audioUri: string) => void;
}

export const VoiceInput = ({ onVoiceInput }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);

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
    return true;
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Microphone access is required for voice input.');
        return;
      }

      const uri = await audioRecorderPlayer.startRecorder();
      setIsRecording(true);
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      const path = await audioRecorderPlayer.stopRecorder();
      setIsRecording(false);

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
      onPressIn={startRecording}
      onPressOut={stopRecording}
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
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRecording: {
    backgroundColor: '#dc2626',
  },
});
