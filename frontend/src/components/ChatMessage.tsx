import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Sparkles, Gavel } from 'lucide-react-native';
import { CitationChip } from './CitationChip';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { useMemo } from 'react';
import { SHADOWS } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';

interface ChatMessageProps {
  text: string;
  sender: 'user' | 'bot' | 'ai'; // support 'ai' as well
  source_sections?: string[];
  confidence?: number;
}

export const ChatMessage = ({
  text,
  sender,
  source_sections,
  confidence,
}: ChatMessageProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  if (sender === 'user') {
    return (
      <Animated.View
        style={[
          styles.userRow,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={[styles.container, styles.userMessage]}>
          <Text style={styles.userText}>{text}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.botRow,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Sparkles size={14} color={colors.white} />
        </View>
      </View>

      <View style={[styles.container, styles.botMessage]}>
        <Text style={styles.botText}>{text}</Text>

        {source_sections && source_sections.length > 0 && (
          <View style={styles.citationsContainer}>
            <View style={styles.legalBadge}>
              <Gavel size={12} color={colors.cyan} />
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

const createStyles = (colors: any) => StyleSheet.create({
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
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow(colors.cyan),
  },
  container: {
    padding: 16,
    maxWidth: '85%',
    borderRadius: 20,
  },
  userMessage: {
    backgroundColor: colors.navy,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 6,
    ...SHADOWS.medium,
  },
  botMessage: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.subtle,
  },
  userText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  botText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  citationsContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    color: colors.textSecondary,
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
