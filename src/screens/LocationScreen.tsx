import React, { useState, useEffect } from 'react';
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
import Ionicons from 'react-native-vector-icons/Ionicons';

const STATES = [
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'KN', name: 'Karnataka' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'DL', name: 'Delhi' },
];

export const LocationScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleManualSelect = (stateCode: string) => {
    dispatch(setState(stateCode));
    setDetectedState(stateCode);
  };

  return (
    <View style={styles.container}>
      <View style={styles.detectSection}>
        <TouchableOpacity
          style={styles.detectButton}
          onPress={handleDetectLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="locate" size={20} color="#ffffff" />
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
              <Ionicons name="checkmark-circle" size={20} color="#1e40af" />
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
    backgroundColor: '#f5f5f5',
  },
  detectSection: {
    padding: 16,
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  detectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  detectedText: {
    marginTop: 12,
    fontSize: 14,
    color: '#059669',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#dc2626',
  },
  manualSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  stateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stateButtonSelected: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  stateButtonText: {
    fontSize: 16,
    color: '#4b5563',
  },
  stateButtonTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
});
