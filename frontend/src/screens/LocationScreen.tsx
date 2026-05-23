/**
 * LocationScreen - GPS-based state detection and manual override
 * 
 * PURPOSE:
 * Allows users to either auto-detect their state using GPS
 * or manually select their state if GPS is unavailable/inaccurate.
 * 
 * HOW IT WORKS:
 * 1. User taps "Detect My Location"
 * 2. App requests GPS permission
 * 3. Gets coordinates and matches against state boundary boxes
 * 4. Displays detected state
 * 5. User can also tap any state from the list to override
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { setState } from '../store/settingsSlice';
import { getCurrentLocation, getStateName } from '../services/location';
import { STATES } from '../constants/states';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const LocationScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Auto-detect state using GPS coordinates
   */
  const handleDetectLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const location = await getCurrentLocation();
      if (location) {
        setDetectedState(location.state);
        dispatch(setState(location.state));
      } else {
        setError('Could not detect location. Please select manually.');
      }
    } catch (err) {
      setError('Location detection failed. Please enable GPS and try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manually select a state (override GPS detection)
   */
  const handleManualSelect = (stateCode: string) => {
    dispatch(setState(stateCode));
    setDetectedState(stateCode);
  };

  return (
    <View style={styles.container}>
      {/* Auto-detect section */}
      <View style={styles.detectSection}>
        <TouchableOpacity
          style={styles.detectButton}
          onPress={handleDetectLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="locate" size={20} color={COLORS.white} />
              <Text style={styles.detectButtonText}>Detect My Location</Text>
            </>
          )}
        </TouchableOpacity>

        {detectedState && (
          <Text style={styles.detectedText}>
            Detected: {getStateName(detectedState)}
          </Text>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Manual state selection list */}
      <View style={styles.manualSection}>
        <Text style={styles.sectionTitle}>Or Select Manually</Text>
        {STATES.map((state) => (
          <TouchableOpacity
            key={state.code}
            style={[
              styles.stateButton,
              detectedState === state.code && styles.stateButtonSelected,
            ]}
            onPress={() => handleManualSelect(state.code)}
          >
            <Text
              style={[
                styles.stateButtonText,
                detectedState === state.code && styles.stateButtonTextSelected,
              ]}
            >
              {state.name}
            </Text>
            {detectedState === state.code && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detectSection: {
    padding: 16,
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.small,
  },
  detectButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  detectedText: {
    marginTop: 12,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.success,
  },
  errorText: {
    marginTop: 8,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.error,
  },
  manualSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: BORDER_RADIUS.medium,
    padding: 16,
    ...SHADOWS.subtle,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  stateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stateButtonSelected: {
    backgroundColor: COLORS.lightPrimary,
    borderRadius: BORDER_RADIUS.small,
    borderBottomWidth: 0,
  },
  stateButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.textSecondary,
  },
  stateButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
