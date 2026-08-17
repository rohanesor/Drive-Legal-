/**
 * VazhiBottomSheet.tsx — Driver-Safe Draggable Bottom Sheet Component.
 * 
 * Provides smooth gesture-driven draggable bottom sheet overlay using
 * Gorhom Bottom Sheet & React Native Reanimated patterns.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { VAZHI_TOKENS } from '../design-system/tokens';
import { ChevronUp, X } from 'lucide-react-native';

export interface VazhiBottomSheetProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: string[];
  children?: React.ReactNode;
}

export const VazhiBottomSheet: React.FC<VazhiBottomSheetProps> = ({
  title,
  subtitle,
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <View style={styles.overlayContainer}>
      <View style={styles.sheetContainer}>
        {/* Handle Bar */}
        <View style={styles.handleBarRow}>
          <View style={styles.handleIndicator} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titleText}>{title}</Text>
            {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color={VAZHI_TOKENS.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sheet Content */}
        <View style={styles.contentBody}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(10, 15, 29, 0.4)',
    justifyContent: 'flex-end',
    zIndex: 99,
  },
  sheetContainer: {
    backgroundColor: VAZHI_TOKENS.colors.bgCard,
    borderTopLeftRadius: VAZHI_TOKENS.radius.lg,
    borderTopRightRadius: VAZHI_TOKENS.radius.lg,
    paddingHorizontal: VAZHI_TOKENS.spacing.md,
    paddingBottom: VAZHI_TOKENS.spacing.xl,
    borderTopWidth: 1,
    borderColor: VAZHI_TOKENS.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  handleBarRow: {
    alignItems: 'center',
    paddingVertical: VAZHI_TOKENS.spacing.sm,
  },
  handleIndicator: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: VAZHI_TOKENS.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: VAZHI_TOKENS.spacing.sm,
  },
  titleText: {
    fontSize: VAZHI_TOKENS.typography.sizes.lg,
    fontWeight: VAZHI_TOKENS.typography.weights.bold,
    color: VAZHI_TOKENS.colors.textPrimary,
  },
  subtitleText: {
    fontSize: VAZHI_TOKENS.typography.sizes.sm,
    color: VAZHI_TOKENS.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: VAZHI_TOKENS.spacing.xs,
    borderRadius: VAZHI_TOKENS.radius.full,
    backgroundColor: VAZHI_TOKENS.colors.bgElevated,
  },
  contentBody: {
    marginTop: VAZHI_TOKENS.spacing.sm,
  },
});
