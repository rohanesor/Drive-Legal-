import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CitationChip } from './CitationChip';
import { ConfidenceIndicator } from './ConfidenceIndicator';

interface ChatMessageProps {
  text: string;
  sender: 'user' | 'bot';
  source_sections?: string[];
  confidence?: number;
  isAlert?: boolean;
}

export const ChatMessage = ({
  text,
  sender,
  source_sections,
  confidence,
  isAlert,
}: ChatMessageProps) => {
  if (sender === 'user') {
    return (
      <View style={[styles.container, styles.userMessage]}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.botMessage]}>
      <Text style={styles.botText}>{text}</Text>

      {source_sections && source_sections.length > 0 && (
        <View style={styles.citationsContainer}>
          {source_sections.map((section, index) => (
            <CitationChip key={index} section={section} />
          ))}
        </View>
      )}

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
    backgroundColor: '#1e40af',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#e0e7ff',
    alignSelf: 'flex-start',
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
