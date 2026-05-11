import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface AlertBannerProps {
  message: string;
  severity: 'low' | 'medium' | 'high';
  onLearnMore: () => void;
  onDismiss: () => void;
}

const severityColors = {
  low: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  medium: { bg: '#fed7aa', border: '#fdba74', text: '#9a3412' },
  high: { bg: '#fecaca', border: '#fca5a5', text: '#991b1b' },
};

const severityIcons = {
  low: 'information-circle-outline',
  medium: 'warning-outline',
  high: 'alert-circle-outline',
};

export const AlertBanner = ({
  message,
  severity,
  onLearnMore,
  onDismiss,
}: AlertBannerProps) => {
  const colors = severityColors[severity];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Ionicons name={severityIcons[severity]} size={20} color={colors.text} />
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onLearnMore} style={styles.learnMoreButton}>
          <Text style={[styles.learnMoreText, { color: colors.text }]}>Learn More</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  learnMoreButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
  },
  learnMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
