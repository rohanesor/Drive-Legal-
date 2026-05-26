import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';
import { Shield, AlertCircle, Heart, Navigation, Car, Phone, AlertTriangle, Info } from 'lucide-react-native';

interface Contact {
  id: string;
  name: string;
  number: string;
  description: string;
  Icon: any;
  color: string;
  accentBg: string;
}

const EMERGENCY_CONTACTS: Contact[] = [
  {
    id: 'police',
    name: 'Traffic Police Helpline',
    number: '103',
    description: 'Direct line for reporting accidents, signaling issues, or requesting municipal traffic help.',
    Icon: Shield,
    color: COLORS.primary,
    accentBg: 'rgba(37, 99, 235, 0.08)',
  },
  {
    id: 'national',
    name: 'National Emergency Number',
    number: '112',
    description: 'Unified single emergency response number for police, fire department, and healthcare.',
    Icon: AlertCircle,
    color: COLORS.error,
    accentBg: 'rgba(239, 68, 68, 0.08)',
  },
  {
    id: 'ambulance',
    name: 'Medical Ambulance Support',
    number: '102',
    description: 'National ambulance hotline for urgent medical transportation and paramedic support.',
    Icon: Heart,
    color: COLORS.success,
    accentBg: 'rgba(34, 197, 94, 0.08)',
  },
  {
    id: 'nhai',
    name: 'NHAI Highway Assistance',
    number: '1033',
    description: 'National Highways Authority of India helpline for towing, highway patrolling, and accidents.',
    Icon: Navigation,
    color: COLORS.warning,
    accentBg: 'rgba(245, 158, 11, 0.08)',
  },
  {
    id: 'towing',
    name: 'Roadside Towing Help',
    number: '1800-419-2000',
    description: 'Commercial 24/7 vehicle towing service and roadside mechanical breakdown assistance.',
    Icon: Car,
    color: COLORS.cyan,
    accentBg: 'rgba(6, 182, 212, 0.08)',
  },
];

export const EmergencyScreen = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleCall = (number: string, name: string) => {
    const url = `tel:${number}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Calling Not Supported', `Dialer is not supported on this device. Call number directly: ${number}`);
        } else {
          Alert.alert(
            'Confirm Call',
            `Would you like to call ${name} (${number})?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Call Now', onPress: () => Linking.openURL(url) },
            ]
          );
        }
      })
      .catch((err) => console.error('An error occurred checking dialer support', err));
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Phone size={20} color={COLORS.error} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Emergency Services</Text>
            <Text style={styles.headerSub}>Instant tap-to-dial safety hotlines</Text>
          </View>
        </View>
        <Animated.View style={[styles.sosIndicator, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.sosText}>SOS</Text>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Warning banner */}
        <View style={styles.alertCard}>
          <View style={styles.alertIconCircle}>
            <AlertTriangle size={20} color={COLORS.textWarning} />
          </View>
          <Text style={styles.alertCardText}>
            Use these numbers only in case of active roadside emergencies, accidents, or official towing requests.
          </Text>
        </View>

        {/* Contact Cards */}
        {EMERGENCY_CONTACTS.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.contactCard}
            onPress={() => handleCall(contact.number, contact.name)}
            activeOpacity={0.85}
          >
            {/* Color accent left border */}
            <View style={[styles.accentBorder, { backgroundColor: contact.color }]} />
            
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: contact.accentBg }]}>
                  <contact.Icon size={24} color={contact.color} />
                </View>
                
                <View style={styles.cardInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={[styles.contactNumber, { color: contact.color }]}>{contact.number}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.callButton, { backgroundColor: contact.color }]}
                  onPress={() => handleCall(contact.number, contact.name)}
                  activeOpacity={0.8}
                >
                  <Phone size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <Text style={styles.contactDesc}>{contact.description}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.noticeContainer}>
          <View style={styles.noticeIconContainer}>
            <Info size={16} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.noticeText}>
            Local helpline availability can vary based on network service provider and state jurisdiction boundaries.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.strong,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.15)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  headerSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sosIndicator: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.error,
    ...SHADOWS.medium,
  },
  sosText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.lightWarning,
    borderWidth: 1,
    borderColor: COLORS.borderWarning,
    borderRadius: BORDER_RADIUS.medium,
    padding: 16,
    marginBottom: 20,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(146, 64, 14, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCardText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textWarning,
    flex: 1,
    lineHeight: 20,
  },
  // Contact Cards with accent border
  contactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: 14,
    ...SHADOWS.subtle,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBorder: {
    width: 4,
    borderTopLeftRadius: BORDER_RADIUS.medium,
    borderBottomLeftRadius: BORDER_RADIUS.medium,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  contactName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  contactNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  contactDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  noticeIconContainer: {
    marginTop: 1,
  },
  noticeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
});
