import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface ConfidenceIndicatorProps {
  confidence: number;
}

export const ConfidenceIndicator = ({ confidence }: ConfidenceIndicatorProps) => {
  let level: 'high' | 'medium' | 'low' = 'low';
  let color = '#dc2626';
  let label = 'Low confidence — verify with your RTO';

  if (confidence >= 0.7) {
    level = 'high';
    color = '#059669';
    label = 'High confidence';
  } else if (confidence >= 0.4) {
    level = 'medium';
    color = '#d97706';
    label = 'Medium confidence';
  }

  return (
    <View style={styles.container}>
      <Ionicons
        name={level === 'high' ? 'checkmark-circle' : level === 'medium' ? 'warning' : 'alert-circle'}
        size={14}
        color={color}
      />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
