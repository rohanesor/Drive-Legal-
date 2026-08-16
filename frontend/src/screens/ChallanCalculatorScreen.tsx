import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { TYPOGRAPHY } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import { useMemo } from 'react';
import { useLocation } from '../context/LocationContext';
import type { StateInfo } from '../constants/states';
import {
  Gauge,
  Zap,
  HardHat,
  UserCheck,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Package,
  FileText,
  MapPin,
  FolderOpen,
  Smartphone,
  Wine,
  Calculator,
  Wallet,
  SlidersHorizontal,
  Repeat,
  Bus,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronDown,
  CheckSquare,
  Square,
  X,
  Activity,
  Award,
} from 'lucide-react-native';
import { executeQuery } from '../services/pythonBridge';
import type { IconComponent } from '../types';

interface Violation {
  id: string;
  violation_type: string;
  name: string;
  section: string;
  baseFine: number;
  subsequentFineMultiplier: number;
  Icon: IconComponent;
  advisory?: string;
  source?: string;
}

interface PenaltyRecord {
  id: string;
  violation_type: string;
  first_offense: string;
  second_offense: string;
  section: string;
}

interface QueryResponse {
  status: string;
  penalties?: PenaltyRecord[];
}

const SUPPORTED_STATES: StateInfo[] = [
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'KN', name: 'Karnataka' },
  { code: 'DL', name: 'Delhi' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'KL', name: 'Kerala' },
];

const VIOLATION_MAP: Record<
  string,
  { name: string; Icon: IconComponent; advisory: string; source: string }
> = {
  speeding: {
    name: 'Over Speeding',
    Icon: Gauge,
    advisory:
      'Maintain speed below state legal limits to avoid collision risks and dynamic fines.',
    source: 'MV Act Section 183',
  },
  traffic_signal: {
    name: 'Signal Jump / Red Light',
    Icon: Zap,
    advisory:
      'Always stop at red signals. Signal jumping compromises intersection safety.',
    source: 'MV Act Section 177',
  },
  no_helmet: {
    name: 'No Helmet / Seatbelt Rider',
    Icon: HardHat,
    advisory:
      'Wear BIS/ISI-certified helmets to avoid ₹1,000 penalties and reduce head injury risks by 80%.',
    source: 'MV Act Section 194D',
  },
  no_seatbelt: {
    name: 'Seatbelt Missing',
    Icon: UserCheck,
    advisory:
      'Keep seatbelts locked at all times. Reduces fatal impact risks by up to 50%.',
    source: 'MV Act Section 194B',
  },
  no_license: {
    name: 'Driving Without License',
    Icon: CreditCard,
    advisory:
      'Carry valid physical or DigiLocker DL to prevent towing and direct court compounding.',
    source: 'MV Act Section 181',
  },
  no_insurance: {
    name: 'No Valid Insurance',
    Icon: ShieldCheck,
    advisory:
      'Third-party coverage is legally mandatory. Protects against liability.',
    source: 'MV Act Section 196',
  },
  dangerous_driving: {
    name: 'Dangerous Driving',
    Icon: AlertTriangle,
    advisory:
      'Avoid reckless tailgating and sudden swerving. Keep traffic flow uniform.',
    source: 'MV Act Section 184',
  },
  overloading: {
    name: 'Overloading Vehicle',
    Icon: Package,
    advisory:
      'Exceeding rated vehicle gross weight stresses axle limits and compromises braking.',
    source: 'MV Act Section 194',
  },
  no_registration: {
    name: 'Driving Without Registration',
    Icon: FileText,
    advisory:
      'Mount standard high-security registration plates (HSRP) to verify vehicle identity.',
    source: 'MV Act Section 192',
  },
  parking_violation: {
    name: 'Wrong Parking / Obstruction',
    Icon: MapPin,
    advisory:
      'Park only in designated bays. Obstructing roadways triggers towing fees.',
    source: 'MV Act Section 177 / 201',
  },
  no_documents: {
    name: 'Missing Required Documents',
    Icon: FolderOpen,
    advisory:
      'Store registration certificate (RC), PUC, and tax receipts digitally for instant verification.',
    source: 'MV Act Section 177',
  },
  mobile_usage: {
    name: 'Mobile Phone Use While Driving',
    Icon: Smartphone,
    advisory:
      'Avoid handling mobile devices while operating LMV. Use hands-free co-pilot controls.',
    source: 'MV Act Section 184(c)',
  },
  drunk_driving: {
    name: 'Drunk Driving',
    Icon: Wine,
    advisory:
      'Compounded drunk driving triggers mandatory court summons and up to 6 months jail term.',
    source: 'MV Act Section 185',
  },
};

const MOCK_EV_VIOLATIONS: Violation[] = [
  {
    id: 'ev_stall_block',
    violation_type: 'ev_rules',
    name: 'Charging Bay Obstruction',
    section: 'MV Act Section 177 / Local Rules',
    baseFine: 500,
    subsequentFineMultiplier: 1.5,
    Icon: Zap,
    advisory:
      'Do not park non-EVs in active green charging bays to prevent blockage penalties.',
    source: 'Urban Parking Enforcement Act 2026',
  },
  {
    id: 'ev_silent_alert',
    violation_type: 'ev_rules',
    name: 'AVAS (Acoustic Alert) Offline',
    section: 'MV Act Section 182A / Safety Code',
    baseFine: 1000,
    subsequentFineMultiplier: 2.0,
    Icon: SlidersHorizontal,
    advisory:
      'Ensure AVAS silent alarm alert sounds are active below 20 km/h to warn blind pedestrians.',
    source: 'National EV Safety Standard Section 4',
  },
  {
    id: 'ev_illegal_battery',
    violation_type: 'ev_rules',
    name: 'Uncertified Battery Mod',
    section: 'MV Act Section 182A(4) / Battery safety',
    baseFine: 5000,
    subsequentFineMultiplier: 2.0,
    Icon: ShieldCheck,
    advisory:
      'Use only manufacturer-certified lithium cells to prevent thermal hazards and battery fires.',
    source: 'AIS 156 Battery Safety Mandate',
  },
  {
    id: 'ev_green_plate',
    violation_type: 'ev_rules',
    name: 'Standard Registration Plate',
    section: 'MV Act Section 177 / Plate Norms',
    baseFine: 500,
    subsequentFineMultiplier: 1.5,
    Icon: CreditCard,
    advisory:
      'Verify green registration plate is mounted to claim EV congestion toll exemptions.',
    source: 'Ministry of Road Transport Order 2024',
  },
];

const parseFine = (fineText: string | null | undefined): number => {
  if (!fineText) {
    return 0;
  }
  const match = fineText.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

import type { AppNavigationProp } from '../types';

export const ChallanCalculatorScreen = ({
  navigation,
}: {
  navigation: AppNavigationProp;
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { location, geoInfo, isMocked, isLoading } = useLocation();

  // Selected state override
  const [selectedState, setSelectedState] = useState('TN');
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  // Selections
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubsequent, setIsSubsequent] = useState(false);
  const [isCommercial, setIsCommercial] = useState(false);
  const [isLatePayment, setIsLatePayment] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search & Categories
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'Safety' | 'Documents' | 'Speed' | 'Parking' | 'EV Rules'
  >('Safety');

  // Set selectedState from geoInfo initially and when geoInfo updates
  useEffect(() => {
    if (geoInfo && geoInfo.stateCode) {
      setSelectedState(geoInfo.stateCode.toUpperCase());
    }
  }, [geoInfo]);

  // Load state penalties on state code changes
  useEffect(() => {
    const fetchPenalties = async () => {
      setLoading(true);
      setSelectedIds([]); // Clear selection when state changes
      try {
        const response: QueryResponse = await executeQuery({
          action: 'get_penalties',
          state: selectedState,
          language: 'en',
          location: {
            lat: location?.latitude || 0,
            lng: location?.longitude || 0,
            state: selectedState,
            city: geoInfo?.city || undefined,
            district: geoInfo?.district || undefined,
          },
        });

        if (response.status === 'success' && response.penalties) {
          const dbPenalties = response.penalties;
          const mappedViolations: Violation[] = dbPenalties.map(
            (p: PenaltyRecord) => {
              const violationType = p.violation_type || '';
              const mapInfo = VIOLATION_MAP[violationType] || {
                name: violationType
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c: string) => c.toUpperCase()),
                Icon: AlertTriangle,
                advisory: 'Follow state standard road safety compliance rules.',
                source: 'Motor Vehicles Act Section 177',
              };
              const baseFine = parseFine(p.first_offense);
              const secondFine = parseFine(p.second_offense);
              const subsequentFineMultiplier =
                baseFine > 0 ? (secondFine || baseFine) / baseFine : 1.0;
              const sectionText = p.section
                ? p.section
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c: string) => c.toUpperCase())
                : 'MV Act';

              return {
                id: p.id,
                violation_type: violationType,
                name: mapInfo.name,
                section: sectionText.startsWith('Mv')
                  ? sectionText.replace('Mv', 'MV')
                  : sectionText,
                baseFine,
                subsequentFineMultiplier,
                Icon: mapInfo.Icon,
                advisory: mapInfo.advisory,
                source: mapInfo.source,
              };
            },
          );

          // Inject custom high-end EV rules
          const finalViolations = [...mappedViolations, ...MOCK_EV_VIOLATIONS];
          setViolations(finalViolations);
        } else {
          setViolations(MOCK_EV_VIOLATIONS);
        }
      } catch (error) {
        console.error('Error fetching penalties:', error);
        setViolations(MOCK_EV_VIOLATIONS);
      } finally {
        setLoading(false);
      }
    };

    fetchPenalties();
  }, [selectedState, location, geoInfo?.city, geoInfo?.district]);

  const getViolationCategory = (violation: Violation): string => {
    const name = violation.name.toLowerCase();
    const type = violation.violation_type.toLowerCase();

    if (
      type === 'ev_rules' ||
      name.includes('ev ') ||
      name.includes('electric') ||
      name.includes('charger') ||
      name.includes('avas') ||
      name.includes('battery')
    ) {
      return 'EV Rules';
    }
    if (
      type === 'parking_violation' ||
      name.includes('parking') ||
      name.includes('wrong park') ||
      name.includes('obstruction') ||
      name.includes('towing')
    ) {
      return 'Parking';
    }
    if (
      type === 'speeding' ||
      name.includes('speed') ||
      name.includes('overspeed') ||
      name.includes('limiter') ||
      name.includes('camera')
    ) {
      return 'Speed';
    }
    if (
      type === 'no_license' ||
      type === 'no_insurance' ||
      type === 'no_registration' ||
      type === 'no_documents' ||
      name.includes('license') ||
      name.includes('registration') ||
      name.includes('insurance') ||
      name.includes('document') ||
      name.includes('rc') ||
      name.includes('puc') ||
      name.includes('papers')
    ) {
      return 'Documents';
    }
    return 'Safety';
  };

  const matchesSearch = (violation: Violation): boolean => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return true;
    }
    return (
      violation.name.toLowerCase().includes(q) ||
      violation.section.toLowerCase().includes(q)
    );
  };

  const filteredViolations = violations.filter((v) => {
    return getViolationCategory(v) === activeTab && matchesSearch(v);
  });

  // Calculations
  let baseSum = 0;
  let subsequentAddition = 0;
  selectedIds.forEach((id) => {
    const v = violations.find((item) => item.id === id);
    if (v) {
      baseSum += v.baseFine;
      if (isSubsequent) {
        subsequentAddition += v.baseFine * (v.subsequentFineMultiplier - 1);
      }
    }
  });

  const commercialAddition = isCommercial && selectedIds.length > 0 ? 1000 : 0;
  const subtotal = baseSum + subsequentAddition + commercialAddition;
  const lateFeeAddition = isLatePayment ? Math.round(subtotal * 0.1) : 0;
  const totalFine = subtotal + lateFeeAddition;

  // Compliance Risk Score calculations
  const getRiskScore = () => {
    if (selectedIds.length === 0) {
      return {
        label: 'LOW RISK',
        color: colors.success,
        score: 100,
        desc: 'Completely Compliant',
      };
    }
    if (selectedIds.length <= 2 && totalFine <= 2000) {
      return {
        label: 'MEDIUM RISK',
        color: colors.warning,
        score: 65,
        desc: 'Minor infractions detected',
      };
    }
    return {
      label: 'HIGH RISK',
      color: colors.error,
      score: 25,
      desc: 'Severe legal non-compliance!',
    };
  };

  const risk = getRiskScore();

  const toggleViolation = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Find active advisories
  const activeAdvisories = violations.filter(
    (v) => selectedIds.includes(v.id) && v.advisory,
  );

  const getGPSStatusText = () => {
    if (isLoading) {
      return 'SEARCHING...';
    }
    if (isMocked) {
      return '🛰️ GPS SIMULATED';
    }
    if (location) {
      return '🛰️ GPS VERIFIED';
    }
    return '⚠️ OVERRIDE';
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#080E1A" barStyle="light-content" />

      {/* TOP COMPASS GPS HEADER */}
      <View style={styles.gpsHeader}>
        <View style={styles.gpsRow}>
          <Activity size={18} color={colors.cyan} style={styles.gpsIcon} />
          <View style={styles.gpsTextBox}>
            <Text style={styles.gpsLabel}>ACTIVE JURISDICTION</Text>
            <Text style={styles.gpsValue}>
              {geoInfo
                ? `${geoInfo.city || geoInfo.district || 'Coimbatore'}, ${
                    geoInfo.state || 'Tamil Nadu'
                  }, IN`
                : 'Coimbatore, TN, India'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.statePill,
              showStateDropdown && { borderColor: colors.cyan },
            ]}
            onPress={() => setShowStateDropdown(!showStateDropdown)}
          >
            <Text style={styles.statePillText}>{selectedState}</Text>
            <ChevronDown size={14} color={colors.cyan} />
          </TouchableOpacity>
        </View>

        <View style={styles.gpsStatusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isMocked
                  ? colors.success
                  : location
                  ? colors.cyan
                  : colors.warning,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isMocked
                  ? colors.success
                  : location
                  ? colors.cyan
                  : colors.warning,
              },
            ]}
          >
            {getGPSStatusText()}
          </Text>
        </View>

        {showStateDropdown && (
          <View style={styles.dropdownGrid}>
            <Text style={styles.dropdownTitle}>
              Select Manual Override Jurisdiction:
            </Text>
            <View style={styles.dropdownPillsRow}>
              {SUPPORTED_STATES.map((s) => (
                <TouchableOpacity
                  key={s.code}
                  style={[
                    styles.dropdownPill,
                    selectedState === s.code && styles.dropdownPillActive,
                  ]}
                  onPress={() => {
                    setSelectedState(s.code);
                    setShowStateDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownPillText,
                      selectedState === s.code && styles.dropdownPillTextActive,
                    ]}
                  >
                    {s.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* COMPLIANCE RISK SCORE WIDGET */}
        <View style={[styles.riskCard, { borderColor: risk.color + '33' }]}>
          <View style={styles.riskHeader}>
            <Award size={20} color={risk.color} />
            <Text style={styles.riskTitle}>COMPLIANCE SECURITY</Text>
          </View>

          <View style={styles.riskBody}>
            <View style={styles.gaugeContainer}>
              <View
                style={[
                  styles.gaugeSegment,
                  { backgroundColor: risk.color, width: `${risk.score}%` },
                ]}
              />
              <View style={styles.gaugeBackground} />
            </View>
            <View style={styles.riskLabels}>
              <Text style={[styles.riskStatus, { color: risk.color }]}>
                {risk.label}
              </Text>
              <Text style={styles.riskDesc}>{risk.desc}</Text>
            </View>
          </View>
        </View>

        {/* DRIVESHIELD ADVISORIES (DYNAMIC TICKER FEED) */}
        {activeAdvisories.length > 0 && (
          <View style={styles.advisoryFeed}>
            <View style={styles.advisoryHeader}>
              <ShieldCheck size={16} color={colors.cyan} />
              <Text style={styles.advisoryTitleText}>
                DRIVESHIELD ADVISORIES
              </Text>
            </View>
            {activeAdvisories.map((v) => (
              <View key={v.id} style={styles.advisoryItem}>
                <Sparkles
                  size={12}
                  color={colors.cyan}
                  style={styles.advisorySparkle}
                />
                <Text style={styles.advisoryText}>
                  <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>
                    {v.name}:{' '}
                  </Text>
                  {v.advisory}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ADJUSTMENTS & SWITCHES */}
        <View style={styles.switchesCard}>
          <View style={styles.switchItem}>
            <View style={styles.switchIconBox}>
              <Repeat size={16} color={colors.warning} />
            </View>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchLabel}>Subsequent Offense</Text>
              <Text style={styles.switchSub}>
                Apply state repeat offender compounding rates
              </Text>
            </View>
            <Switch
              value={isSubsequent}
              onValueChange={setIsSubsequent}
              trackColor={{ false: '#161F30', true: colors.warning + '33' }}
              thumbColor={isSubsequent ? colors.warning : '#475569'}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.switchIconBox}>
              <Bus size={16} color={colors.cyan} />
            </View>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchLabel}>Commercial LMV</Text>
              <Text style={styles.switchSub}>
                Flat ₹1,000 carrier surcharge limits
              </Text>
            </View>
            <Switch
              value={isCommercial}
              onValueChange={setIsCommercial}
              trackColor={{ false: '#161F30', true: colors.cyan + '33' }}
              thumbColor={isCommercial ? colors.cyan : '#475569'}
            />
          </View>

          <View style={[styles.switchItem, { borderBottomWidth: 0 }]}>
            <View style={styles.switchIconBox}>
              <Clock size={16} color={colors.error} />
            </View>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchLabel}>
                Late Compound (&gt;30 Days)
              </Text>
              <Text style={styles.switchSub}>
                10% overdue state compound enforcement penalty
              </Text>
            </View>
            <Switch
              value={isLatePayment}
              onValueChange={setIsLatePayment}
              trackColor={{ false: '#161F30', true: colors.error + '33' }}
              thumbColor={isLatePayment ? colors.error : '#475569'}
            />
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by infraction, law code..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <Sparkles size={16} color={colors.cyan} />
          )}
        </View>

        {/* CATEGORY TABS NAVIGATION BAR */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContainer}
        >
          {(
            ['Safety', 'Documents', 'Speed', 'Parking', 'EV Rules'] as const
          ).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive && styles.tabButtonTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* RESPONSIVE TWO-COLUMN GRID OF VIOLATION CARDS */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={styles.loadingText}>
              Synchronizing State Compound Table...
            </Text>
          </View>
        ) : filteredViolations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={32} color="#64748B" />
            <Text style={styles.emptyText}>
              No violations found in this category.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {filteredViolations.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.violationCard,
                    isSelected && styles.violationCardSelected,
                  ]}
                  onPress={() => toggleViolation(item.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.cardIconBox,
                        isSelected && { backgroundColor: colors.cyan + '1A' },
                      ]}
                    >
                      <item.Icon
                        size={18}
                        color={isSelected ? colors.cyan : '#64748B'}
                      />
                    </View>
                    {isSelected ? (
                      <CheckSquare size={16} color={colors.cyan} />
                    ) : (
                      <Square size={16} color="#334155" />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.cardName,
                      isSelected && { color: '#FFFFFF' },
                    ]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  <Text style={styles.cardSection} numberOfLines={1}>
                    {item.section}
                  </Text>

                  <View style={styles.cardPriceRow}>
                    <Text style={styles.cardPriceLabel}>BASE FINE</Text>
                    <Text
                      style={[
                        styles.cardPriceValue,
                        isSelected && { color: colors.cyan },
                      ]}
                    >
                      ₹{item.baseFine.toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* TOTAL COMPENSATING DRAWER PANEL */}
      {selectedIds.length > 0 && (
        <View style={styles.drawerCard}>
          <View style={styles.drawerHeader}>
            <View style={styles.drawerHeaderLeft}>
              <Wallet size={18} color={colors.cyan} />
              <Text style={styles.drawerTitle}>TOTAL COMPOUND FINE</Text>
            </View>
            <Text style={styles.drawerTotal}>
              ₹{totalFine.toLocaleString()}
            </Text>
          </View>

          <View style={styles.drawerDivider} />

          <View style={styles.drawerBreakdown}>
            <Text style={styles.breakdownItem}>
              Base Infractions ({selectedIds.length}):{' '}
              <Text style={styles.breakdownItemVal}>
                ₹{baseSum.toLocaleString()}
              </Text>
            </Text>
            {isSubsequent && subsequentAddition > 0 && (
              <Text style={styles.breakdownItem}>
                Repeat Offender Penalty:{' '}
                <Text
                  style={[styles.breakdownItemVal, { color: colors.warning }]}
                >
                  +₹{subsequentAddition.toLocaleString()}
                </Text>
              </Text>
            )}
            {isCommercial && commercialAddition > 0 && (
              <Text style={styles.breakdownItem}>
                Commercial Vehicle Surcharge:{' '}
                <Text style={[styles.breakdownItemVal, { color: colors.cyan }]}>
                  +₹{commercialAddition.toLocaleString()}
                </Text>
              </Text>
            )}
            {isLatePayment && lateFeeAddition > 0 && (
              <Text style={styles.breakdownItem}>
                Late Fee (10% Compounded):{' '}
                <Text
                  style={[styles.breakdownItemVal, { color: colors.error }]}
                >
                  +₹{lateFeeAddition.toLocaleString()}
                </Text>
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => {
              const names = violations
                .filter((v) => selectedIds.includes(v.id))
                .map((v) => v.name)
                .join(', ');
              navigation.navigate('Chat', {
                initialQuery: `Explain the compounding rules, legal procedures, and mitigating arguments for the following offenses: ${names} under ${selectedState} jurisdiction.`,
              });
            }}
          >
            <Sparkles size={16} color="#000000" />
            <Text style={styles.aiButtonText}>CONSULT ROADMIND AI</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  gpsHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    padding: 14,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsIcon: {
    marginRight: 8,
  },
  gpsTextBox: {
    flex: 1,
  },
  gpsLabel: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  gpsValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  statePillText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: 'bold',
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 2,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dropdownGrid: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
  },
  dropdownPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownPill: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownPillActive: {
    borderColor: colors.cyan,
    backgroundColor: colors.lightPrimary,
  },
  dropdownPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  dropdownPillTextActive: {
    color: colors.cyan,
  },

  // Compliance Risk Card
  riskCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 16,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  riskTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  riskBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  gaugeContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  gaugeSegment: {
    height: '100%',
    borderRadius: 4,
  },
  gaugeBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  riskLabels: {
    alignItems: 'flex-end',
  },
  riskStatus: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  riskDesc: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },

  // DriveShield Advisory
  advisoryFeed: {
    backgroundColor: 'rgba(0, 229, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  advisoryTitleText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  advisoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  advisorySparkle: {
    marginTop: 2,
    marginRight: 6,
  },
  advisoryText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    flex: 1,
  },

  // Switches Card
  switchesCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  switchTextBox: {
    flex: 1,
    marginRight: 10,
  },
  switchLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  switchSub: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },

  // Search Input
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 8,
  },

  // Tabs scroll
  tabsScroll: {
    marginBottom: 14,
  },
  tabsContainer: {
    gap: 8,
    paddingRight: 16,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.lightPrimary,
    borderColor: colors.cyan,
  },
  tabButtonText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabButtonTextActive: {
    color: colors.cyan,
  },

  // Cards Grid Layout (Max 2 cards per row)
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  violationCard: {
    width: (Dimensions.get('window').width - 44) / 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 128,
  },
  violationCardSelected: {
    borderColor: colors.cyan,
    backgroundColor: colors.lightPrimary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 15,
    marginBottom: 4,
  },
  cardSection: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  cardPriceLabel: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardPriceValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },

  // Load and Empties
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Bottom drawer panel
  drawerCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 2.5,
    borderTopColor: colors.cyan,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawerTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  drawerTotal: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  drawerBreakdown: {
    gap: 4,
    marginBottom: 12,
  },
  breakdownItem: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  breakdownItemVal: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyan,
    borderRadius: 8,
    paddingVertical: 11,
    gap: 6,
  },
  aiButtonText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export default ChallanCalculatorScreen;
