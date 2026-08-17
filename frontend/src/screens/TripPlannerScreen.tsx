import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useThemeColors } from '../context/ThemeContext';
import { tripPlannerEngine, TripPlan, TripPreferences } from '../domain/trip/TripPlannerEngine';
import {
  Calendar,
  Clock,
  Compass,
  ArrowRight,
  MapPin,
  Utensils,
  Hotel,
  Compass as EvIcon,
  Flame,
  ArrowLeft,
} from 'lucide-react-native';
import { BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import type { AppNavigationProp } from '../types';

export const TripPlannerScreen = ({
  navigation,
}: {
  navigation: AppNavigationProp;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [originText, setOriginText] = useState('Coimbatore');
  const [destText, setDestText] = useState('Ooty');
  const [startTime, setStartTime] = useState('06:00');
  const [startDate, setStartDate] = useState('2026-08-18');
  
  const [vehicle, setVehicle] = useState<'car' | 'motorcycle' | 'heavy'>('car');
  const [fuel, setFuel] = useState<'petrol' | 'diesel' | 'ev'>('ev');
  const [budget, setBudget] = useState<'budget' | 'mid' | 'premium'>('mid');
  const [food, setFood] = useState<'veg' | 'non-veg' | 'any'>('veg');

  const [loading, setLoading] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);

  const handleGeneratePlan = () => {
    if (!originText || !destText) {
      Alert.alert('Missing Fields', 'Please enter origin and destination.');
      return;
    }
    
    setLoading(true);
    
    // Simulate slight API parsing delay
    setTimeout(() => {
      try {
        const originCoords = { lat: 11.0168, lng: 76.9558 }; // Coimbatore
        const destCoords = { lat: 11.4102, lng: 76.6950 }; // Ooty
        
        const prefs: TripPreferences = {
          vehicleType: vehicle,
          fuelType: fuel,
          budget,
          foodPreference: food,
        };

        const plan = tripPlannerEngine.generateItinerary(
          originCoords,
          destCoords,
          destText,
          startDate,
          startTime,
          prefs
        );
        
        setTripPlan(plan);
      } catch (err) {
        Alert.alert('Error', 'Failed to generate temporal trip plan.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const getPoiIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Utensils size={18} color={colors.cyan} />;
      case 'hotel':
        return <Hotel size={18} color={colors.warning} />;
      case 'charger':
        return <EvIcon size={18} color={colors.success} />;
      case 'fuel':
        return <Flame size={18} color={colors.error} />;
      default:
        return <MapPin size={18} color={colors.primary} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vazhi Trip Planner</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {!tripPlan ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Configure Your Trip</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Origin Location</Text>
              <TextInput
                value={originText}
                onChangeText={setOriginText}
                style={styles.input}
                placeholder="Starting city"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Destination Location</Text>
              <TextInput
                value={destText}
                onChangeText={setDestText}
                style={styles.input}
                placeholder="Target city"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Departure Date</Text>
                <View style={styles.rowInput}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <TextInput
                    value={startDate}
                    onChangeText={setStartDate}
                    style={styles.inputInline}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Start Time (24h)</Text>
                <View style={styles.rowInput}>
                  <Clock size={16} color={colors.textSecondary} />
                  <TextInput
                    value={startTime}
                    onChangeText={setStartTime}
                    style={styles.inputInline}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Fuel / Vehicle Type</Text>
            <View style={styles.choiceRow}>
              {(['petrol', 'diesel', 'ev'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.choiceBtn, fuel === f && styles.choiceBtnActive]}
                  onPress={() => setFuel(f)}
                >
                  <Text style={[styles.choiceText, fuel === f && styles.choiceTextActive]}>
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Food Preference</Text>
            <View style={styles.choiceRow}>
              {(['veg', 'non-veg', 'any'] as const).map(fd => (
                <TouchableOpacity
                  key={fd}
                  style={[styles.choiceBtn, food === fd && styles.choiceBtnActive]}
                  onPress={() => setFood(fd)}
                >
                  <Text style={[styles.choiceText, food === fd && styles.choiceTextActive]}>
                    {fd.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Budget Category</Text>
            <View style={styles.choiceRow}>
              {(['budget', 'mid', 'premium'] as const).map(b => (
                <TouchableOpacity
                  key={b}
                  style={[styles.choiceBtn, budget === b && styles.choiceBtnActive]}
                  onPress={() => setBudget(b)}
                >
                  <Text style={[styles.choiceText, budget === b && styles.choiceTextActive]}>
                    {b.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleGeneratePlan}
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.submitBtnText}>Generate Time-Aware Plan</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{tripPlan.routeTitle}</Text>
              <Text style={styles.planMetrics}>
                Distance: {tripPlan.totalDistanceKm} km · Duration: {tripPlan.totalDurationHours} hrs
              </Text>
            </View>

            <Text style={styles.timelineLabel}>Travel Itinerary Timeline</Text>
            
            {tripPlan.stops.map((stop, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{stop.timeOfArrival}</Text>
                  {index < tripPlan.stops.length - 1 && <View style={styles.timeLine} />}
                </View>
                
                <View style={styles.stopContent}>
                  <Text style={styles.activityTitle}>{stop.activityName}</Text>
                  <Text style={styles.activityDesc}>{stop.description}</Text>
                  
                  {stop.poi && (
                    <View style={styles.poiContainer}>
                      <View style={styles.poiIcon}>
                        {getPoiIcon(stop.poi.type)}
                      </View>
                      <View style={styles.poiDetails}>
                        <Text style={styles.poiName}>{stop.poi.name}</Text>
                        <Text style={styles.poiSub}>
                          {stop.poi.address} · Rating: ★{stop.poi.rating}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setTripPlan(null)}
              style={[styles.submitBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            >
              <Text style={[styles.submitBtnText, { color: colors.textPrimary }]}>
                Modify Settings
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContainer: {
    padding: 16,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.medium,
    padding: 20,
    ...SHADOWS.subtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.navy,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
  },
  rowInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputInline: {
    flex: 1,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
    marginLeft: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  choiceBtn: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  choiceBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  choiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  choiceTextActive: {
    color: colors.primary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.small,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    ...SHADOWS.subtle,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.medium,
    padding: 20,
    ...SHADOWS.subtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planMetrics: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timeLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 8,
  },
  stopContent: {
    flex: 1,
    paddingLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  poiContainer: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
    borderRadius: BORDER_RADIUS.small,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poiIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  poiDetails: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  poiName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  poiSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
