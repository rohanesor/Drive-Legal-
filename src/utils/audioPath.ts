import { Platform } from 'react-native';

export const getAudioPath = (path: string): string => {
  if (Platform.OS === 'android') {
    return path.replace('file://', '');
  }
  return path;
};
