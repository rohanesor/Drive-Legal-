/**
 * Audio Path Utility
 * 
 * Converts file URIs between Android and platform-specific formats.
 * Android file paths sometimes have 'file://' prefix that needs to be
 * stripped before passing to the Python backend.
 */
import { Platform } from 'react-native';

export const getAudioPath = (path: string): string => {
  if (Platform.OS === 'android') {
    return path.replace('file://', '');
  }
  return path;
};
