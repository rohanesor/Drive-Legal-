/**
 * ConfidenceIndicator - Visual reliability indicator for bot responses
 * 
 * PURPOSE:
 * Shows how confident the system is in its answer based on the
 * semantic search similarity score.
 * 
 * THREE LEVELS:
 * - Green (High): FAISS similarity > 0.7 - Very relevant law found
 * - Yellow (Medium): FAISS similarity 0.4-0.7 - Moderately relevant
 * - Red (Low): FAISS similarity < 0.4 - Keyword fallback used, verify with RTO
 * 
 * This transparency helps users understand when to trust the answer
 * and when to double-check with official sources.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react-native';

interface ConfidenceIndicatorProps {
  confidence: number; // 0.0 to 1.0
}

export const ConfidenceIndicator = ({ confidence }: ConfidenceIndicatorProps) => {
  // Determine level based on confidence score
  let level: 'high' | 'medium' | 'low' = 'low';
  let color = COLORS.error;
  let label = 'Low confidence — verify with your RTO';

  if (confidence >= 0.7) {
    level = 'high';
    color = COLORS.success;
    label = 'High confidence';
  } else if (confidence >= 0.4) {
    level = 'medium';
    color = COLORS.warning;
    label = 'Medium confidence';
  }

  return (
    <View style={styles.container}>
      {level === 'high' ? (
        <CheckCircle size={14} color={color} />
      ) : level === 'medium' ? (
        <AlertTriangle size={14} color={color} />
      ) : (
        <AlertCircle size={14} color={color} />
      )}
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
