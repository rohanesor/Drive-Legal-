import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Sparkles, Info, Gavel } from 'lucide-react-native';
import { CitationChip } from './CitationChip';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';

interface ChatMessageProps {
  text: string;
  sender: 'user' | 'bot';
  source_sections?: string[];
  confidence?: number;
}

export const ChatMessage = ({
  text,
  sender,
  source_sections,
  confidence,
}: ChatMessageProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  if (sender === 'user') {
    return (
      <Animated.View style={[styles.userRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.container, styles.userMessage]}>
          <Text style={styles.userText}>{text}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.botRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Sparkles size={14} color={COLORS.white} />
        </View>
      </View>

      <View style={[styles.container, styles.botMessage]}>
        <Text style={styles.botText}>{text}</Text>

        {source_sections && source_sections.length > 0 && (
          <View style={styles.citationsContainer}>
            <View style={styles.legalBadge}>
              <Gavel size={12} color={COLORS.cyan} />
              <Text style={styles.legalBadgeTxt}>LEGAL SOURCES</Text>
            </View>
            <View style={styles.chipRow}>
              {source_sections.map((section, index) => (
                <CitationChip key={index} section={section} />
              ))}
            </View>
          </View>
        )}

        {confidence !== undefined && (
          <View style={styles.confidenceWrapper}>
            <ConfidenceIndicator confidence={confidence} />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  botRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginVertical: 10,
    marginHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 10,
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow(COLORS.cyan),
  },
  container: {
    padding: 16,
    maxWidth: '85%',
    borderRadius: 20,
  },
  userMessage: {
    backgroundColor: COLORS.navy,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 6,
    ...SHADOWS.medium,
  },
  botMessage: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.22)',
    ...SHADOWS.subtle,
  },
  userText: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  botText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  citationsContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  legalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  legalBadgeTxt: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  confidenceWrapper: {
    marginTop: 12,
    paddingTop: 8,
  },
});
