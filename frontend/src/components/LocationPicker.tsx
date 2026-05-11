/**
 * LocationPicker - Dropdown for manual state selection
 * 
 * Used within the SettingsScreen as an alternative to the
 * dedicated LocationScreen. Shows all supported states
 * with checkmark for currently selected state.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { setState } from '../store/settingsSlice';
import { getStateName } from '../services/location';

interface LocationPickerProps {
  onSelect?: (state: string) => void;
}

const STATES = [
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'KN', name: 'Karnataka' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'DL', name: 'Delhi' },
];

export const LocationPicker = ({ onSelect }: LocationPickerProps) => {
  const dispatch = useDispatch();
  const currentState = useSelector((state: RootState) => state.settings.state);

  const handleSelect = (stateCode: string) => {
    dispatch(setState(stateCode));
    if (onSelect) onSelect(stateCode);
  };

  return (
    <View style={styles.container}>
      {STATES.map((state) => (
        <TouchableOpacity
          key={state.code}
          style={[
            styles.stateItem,
            currentState === state.code && styles.stateItemSelected,
          ]}
          onPress={() => handleSelect(state.code)}
        >
          <Text
            style={[
              styles.stateName,
              currentState === state.code && styles.stateNameSelected,
            ]}
          >
            {state.name}
          </Text>
          <Text style={styles.stateCode}>{state.code}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 8 },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stateItemSelected: { backgroundColor: '#e0e7ff' },
  stateName: { fontSize: 16, color: '#4b5563' },
  stateNameSelected: { color: '#1e40af', fontWeight: '600' },
  stateCode: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
});
