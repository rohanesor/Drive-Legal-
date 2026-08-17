import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { dismissAlert } from '../../store/alertSlice';
import { CAR_COLORS, CAR_TYPOGRAPHY, CAR_SPACING } from '../../constants/theme';
import { AlertTriangle, Mic, X } from 'lucide-react-native';

export const CarAlertScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();

  // Retrieve alert attributes from routing parameters
  const {
    id,
    zone_type = 'custom',
    zone_name = 'Unknown Zone',
    message = 'Active warning detected.',
    suggested_query = '',
    severity = 'medium',
  } = route.params || {};

  // Auto dismiss this critical taking-over screen after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    dispatch(dismissAlert());
    navigation.goBack();
  };

  const handleAskVazhi = () => {
    dispatch(dismissAlert());
    navigation.navigate('CarVoice');
    // Pre-prompt AI voice screen if needed
  };

  const getAlertColor = () => {
    switch (severity) {
      case 'high':
        return CAR_COLORS.danger;
      case 'medium':
        return CAR_COLORS.warning;
      default:
        return CAR_COLORS.accent;
    }
  };

  return (
    <View style={[styles.container, { borderColor: getAlertColor() }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Close button top right */}
      <View style={styles.topRow}>
        <Text style={[styles.warningBadge, { color: getAlertColor() }]}>
          ⚠️ {severity.toUpperCase()} PRIORITY ALERT
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X color="#FFFFFF" size={32} />
        </TouchableOpacity>
      </View>

      {/* Alert content */}
      <View style={styles.content}>
        <AlertTriangle color={getAlertColor()} size={84} />
        <Text style={[styles.alertTitle, { color: getAlertColor() }]}>
          {zone_name.toUpperCase()}
        </Text>
        <Text style={styles.alertMessage}>{message}</Text>
      </View>

      {/* Driver safe bottom action row */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: getAlertColor() }]}
          onPress={handleAskVazhi}
        >
          <Mic color="#000000" size={28} />
          <Text style={styles.buttonText}>ASK VAZHI</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissButton} onPress={handleClose}>
          <Text style={styles.dismissText}>DISMISS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: CAR_SPACING.padding,
    borderWidth: 8,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  warningBadge: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  closeButton: {
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  alertTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 2,
  },
  alertMessage: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 32,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 16,
    height: 80,
  },
  actionButton: {
    flex: 1.5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default CarAlertScreen;
