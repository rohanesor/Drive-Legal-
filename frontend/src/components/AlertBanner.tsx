/**
 * AlertBanner - Zone alert notification shown at top of chat screen
 * 
 * PURPOSE:
 * When the background GPS monitoring detects the user has entered
 * a traffic law zone (accident-prone area, school zone, etc.),
 * this banner appears at the top of the chat screen.
 * 
 * USER ACTIONS:
 * - "Learn More": Opens chat with a pre-filled question about this zone
 * - "X" button: Dismisses the alert
 * 
 * SEVERITY COLORS:
 * - Low: Yellow (informational)
 * - Medium: Orange (caution)
 * - High: Red (urgent)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Info, AlertTriangle, AlertCircle, X, ArrowRight } from 'lucide-react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface AlertBannerProps {
  message: string;
  severity: 'low' | 'medium' | 'high';
  onLearnMore: () => void;
  onDismiss: () => void;
}

// Color schemes for each severity level
const severityColors = {
  low: { bg: COLORS.lightWarning, border: COLORS.borderWarning, text: COLORS.textWarning },
  medium: { bg: COLORS.orangeLight, border: COLORS.orangeBorder, text: COLORS.orangeDark },
  high: { bg: COLORS.redLight, border: COLORS.redBorder, text: COLORS.redDark },
};

const SeverityIcon = ({ severity, color, size }: { severity: string; color: string; size: number }) => {
  switch (severity) {
    case 'high': return <AlertCircle size={size} color={color} />;
    case 'medium': return <AlertTriangle size={size} color={color} />;
    default: return <Info size={size} color={color} />;
  }
};

export const AlertBanner = ({
  message,
  severity,
  onLearnMore,
  onDismiss,
}: AlertBannerProps) => {
  const colors = severityColors[severity];
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { 
        toValue: 0, 
        friction: 5, 
        tension: 80, 
        useNativeDriver: true 
      }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: colors.bg, 
        borderColor: colors.border,
        opacity: opacityAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      {/* Warning icon and Alert message text row */}
      <View style={styles.contentRow}>
        <SeverityIcon severity={severity} color={colors.text} size={18} />
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      </View>
      
      {/* Separator and Action buttons row */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          onPress={onLearnMore} 
          style={[styles.learnMoreButton, { backgroundColor: 'rgba(0,0,0,0.05)' }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.learnMoreText, { color: colors.text }]}>Learn More</Text>
          <ArrowRight size={12} color={colors.text} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <X size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    ...SHADOWS.subtle,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    paddingTop: 8,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.small,
  },
  learnMoreText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissButton: {
    padding: 4,
  },
});
