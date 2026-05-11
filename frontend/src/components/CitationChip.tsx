/**
 * CitationChip - Clickable law citation badge
 * 
 * PURPOSE:
 * Displays a law section reference (e.g., "MV Act §188") as a tappable chip.
 * When tapped, shows the full text of that law in a modal popup.
 * 
 * WHY THIS MATTERS:
 * Users need to verify the bot's answers. Showing the actual law text
 * gives them confidence that the information is accurate and not hallucinated.
 * This is the key trust-building feature of DriveLegal.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface CitationChipProps {
  section: string;   // Law section name (e.g., "Motor Vehicles Act, Section 188")
  fullText?: string; // Full text of the law (optional, defaults to placeholder)
}

export const CitationChip = ({ section, fullText }: CitationChipProps) => {
  const [showModal, setShowModal] = useState(false);

  const displayText = fullText || `Full text for ${section} is not available.`;

  return (
    <>
      {/* The clickable citation chip */}
      <TouchableOpacity
        style={styles.chip}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="document-text-outline" size={12} color="#1e40af" />
        <Text style={styles.chipText}>{section}</Text>
      </TouchableOpacity>

      {/* Modal showing the full law text */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{section}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.modalText}>{displayText}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '85%',
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e40af',
  },
  modalText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
  },
});
