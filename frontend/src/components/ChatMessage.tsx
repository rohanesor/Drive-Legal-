/**
 * ChatMessage - Individual message bubble in the chat
 * 
 * RENDERS DIFFERENTLY BASED ON SENDER:
 * - User messages: Blue bubble, aligned right
 * - Bot messages: Light blue bubble, aligned left, with citations and confidence
 * 
 * TRUST SIGNALS (on bot messages):
 * 1. Source citations - Clickable chips showing law sections (e.g., "MV Act §188")
 * 2. Confidence indicator - Green/yellow/red dot showing search reliability
 * 
 * This component is the primary way users see the bot's legal information,
 * so trust signals are crucial for user confidence.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CitationChip } from './CitationChip';
import { ConfidenceIndicator } from './ConfidenceIndicator';

interface ChatMessageProps {
  text: string;
  sender: 'user' | 'bot';
  source_sections?: string[];  // Law citations
  confidence?: number;          // 0.0 to 1.0
  isAlert?: boolean;
}

export const ChatMessage = ({
  text,
  sender,
  source_sections,
  confidence,
  isAlert,
}: ChatMessageProps) => {
  // User messages are simple text bubbles
  if (sender === 'user') {
    return (
      <View style={[styles.container, styles.userMessage]}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    );
  }

  // Bot messages include trust signals (citations + confidence)
  return (
    <View style={[styles.container, styles.botMessage]}>
      {/* The actual response text */}
      <Text style={styles.botText}>{text}</Text>

      {/* Source citations - clickable chips showing law sections */}
      {source_sections && source_sections.length > 0 && (
        <View style={styles.citationsContainer}>
          {source_sections.map((section, index) => (
            <CitationChip key={index} section={section} />
          ))}
        </View>
      )}

      {/* Confidence indicator - shows how reliable this answer is */}
      {confidence !== undefined && (
        <View style={styles.confidenceContainer}>
          <ConfidenceIndicator confidence={confidence} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#1e40af', // Dark blue
    alignSelf: 'flex-end',      // Right-aligned
  },
  botMessage: {
    backgroundColor: '#e0e7ff', // Light blue
    alignSelf: 'flex-start',    // Left-aligned
  },
  userText: {
    color: '#ffffff',
    fontSize: 15,
  },
  botText: {
    color: '#1e40af',
    fontSize: 15,
    lineHeight: 22,
  },
  citationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  confidenceContainer: {
    marginTop: 6,
  },
});
