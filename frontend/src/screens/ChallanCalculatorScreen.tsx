import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  ActivityIndicator,
  Animated,
  Platform,
  TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, GLASS } from '../constants/theme';
import { getStateName, getJurisdictionLabel } from '../services/locationService';
import { useLocation } from '../context/LocationContext';
import { Gauge, Zap, HardHat, UserCheck, CreditCard, ShieldCheck, AlertTriangle, Package, FileText, MapPin, FolderOpen, Smartphone, Wine, Calculator, Wallet, SlidersHorizontal, Repeat, Bus, Clock, List, AlertCircle, Sparkles, ChevronRight, ChevronDown, CheckSquare, Square, Search, X, Trash2 } from 'lucide-react-native';
import { executeQuery } from '../services/pythonBridge';

interface Violation {
  id: string;
  violation_type: string;
  name: string;
  section: string;
  baseFine: number;
  subsequentFineMultiplier: number;
  Icon: any;
}

const COMMON_VIOLATIONS = [
  { type: 'no_helmet', name: 'No Helmet', Icon: HardHat },
  { type: 'no_seatbelt', name: 'No Seatbelt', Icon: UserCheck },
  { type: 'speeding', name: 'Over Speeding', Icon: Gauge },
  { type: 'drunk_driving', name: 'Drunk Driving', Icon: Wine },
  { type: 'mobile_usage', name: 'Mobile Use', Icon: Smartphone },
  { type: 'no_license', name: 'No License', Icon: CreditCard },
];

const SUGGESTION_TAGS = ['Helmet', 'License', 'Speeding', 'Seatbelt', 'Insurance', 'Signal Jump'];


const VIOLATION_MAP: Record<string, { name: string; Icon: any }> = {
  speeding: { name: 'Over Speeding', Icon: Gauge },
  traffic_signal: { name: 'Signal Jump / Red Light', Icon: Zap },
  no_helmet: { name: 'No Helmet / Seatbelt Rider', Icon: HardHat },
  no_seatbelt: { name: 'Seatbelt Missing', Icon: UserCheck },
  no_license: { name: 'Driving Without License', Icon: CreditCard },
  no_insurance: { name: 'No Valid Insurance', Icon: ShieldCheck },
  dangerous_driving: { name: 'Dangerous Driving', Icon: AlertTriangle },
  overloading: { name: 'Overloading Vehicle', Icon: Package },
  no_registration: { name: 'Driving Without Registration', Icon: FileText },
  parking_violation: { name: 'Wrong Parking / Obstruction', Icon: MapPin },
  no_documents: { name: 'Missing Required Documents', Icon: FolderOpen },
  mobile_usage: { name: 'Mobile Phone Use While Driving', Icon: Smartphone },
  drunk_driving: { name: 'Drunk Driving', Icon: Wine },
};

const parseFine = (fineText: string | null | undefined): number => {
  if (!fineText) return 0;
  const match = fineText.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const ChallanCalculatorScreen = ({ navigation }: any) => {
  const userState = useSelector((state: RootState) => state.settings.state);
  const { location, geoInfo } = useLocation();

  // Calculator selections
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubsequent, setIsSubsequent] = useState(false);
  const [isCommercial, setIsCommercial] = useState(false);
  const [isLatePayment, setIsLatePayment] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Safety: true,
    Documents: false,
    Other: false,
  });

  const getViolationCategory = (violation: Violation): string => {
    const name = violation.name.toLowerCase();
    if (name.includes('helmet') || name.includes('seatbelt') || name.includes('speed') || name.includes('dangerous') || name.includes('drunk') || name.includes('phone') || name.includes('mobile') || name.includes('signal') || name.includes('traffic') || name.includes('parking') || name.includes('obstruction')) {
      return 'Safety';
    }
    if (name.includes('license') || name.includes('registration') || name.includes('insurance') || name.includes('document') || name.includes('permit') || name.includes('rc') || name.includes('puc') || name.includes('paper')) {
      return 'Documents';
    }
    return 'Other';
  };

  const matchesFuzzy = (violationName: string, sectionText: string, queryText: string): boolean => {
    const q = queryText.toLowerCase().trim();
    if (!q) return true;
    
    // Direct matches
    if (violationName.toLowerCase().includes(q) || sectionText.toLowerCase().includes(q)) {
      return true;
    }
    
    // Synonym mapping
    const synonyms: Record<string, string[]> = {
      speeding: ['speed', 'overspeed', 'fast', 'camera', 'limiter', 'high speed'],
      traffic_signal: ['signal', 'red light', 'jump', 'traffic light', 'crossing'],
      no_helmet: ['helmet', 'head', 'two wheeler', 'bike', 'rider', 'pillion'],
      no_seatbelt: ['belt', 'seatbelt', 'seat belt', 'car safety', 'driver safety'],
      no_license: ['license', 'dl', 'driving license', 'permit', 'licence'],
      no_insurance: ['insurance', 'third party', 'policy'],
      dangerous_driving: ['dangerous', 'rash', 'reckless', 'negligent'],
      overloading: ['load', 'overload', 'cargo', 'passenger capacity', 'weight'],
      no_registration: ['registration', 'rc', 'number plate', 'rc book', 'smart card'],
      parking_violation: ['parking', 'wrong park', 'tow', 'obstruction', 'no parking'],
      no_documents: ['documents', 'papers', 'puc', 'pollution', 'emission'],
      mobile_usage: ['phone', 'mobile', 'call', 'texting', 'chatting', 'device', 'screen'],
      drunk_driving: ['drunk', 'alcohol', 'drink', 'drinking', 'wine', 'beer', 'liquor', 'breathalyzer'],
    };

    // Check if query matches any keywords for a specific violation_type
    for (const [vType, keywords] of Object.entries(synonyms)) {
      if (keywords.some(kw => kw.includes(q) || q.includes(kw))) {
        // Find if this violation name maps to this type
        const match = violations.find(item => item.name === violationName);
        if (match && match.violation_type === vType) {
          return true;
        }
      }
    }
    
    return false;
  };

  const filteredViolations = violations.filter(violation => {
    const matchesSearch = matchesFuzzy(violation.name, violation.section, searchQuery);
    if (activeCategory === 'All') return matchesSearch;
    return matchesSearch && getViolationCategory(violation) === activeCategory;
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Computed Values
  const [totalFine, setTotalFine] = useState(0);
  const [baseSum, setBaseSum] = useState(0);
  const [subsequentAddition, setSubsequentAddition] = useState(0);
  const [commercialAddition, setCommercialAddition] = useState(0);
  const [lateFeeAddition, setLateFeeAddition] = useState(0);

  // Animations
  const totalPulse = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0.9)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  // Shimmer animation for total card
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // Loading entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(loadingScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(loadingOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse total on change
  useEffect(() => {
    if (totalFine > 0) {
      Animated.sequence([
        Animated.timing(totalPulse, { toValue: 1.06, duration: 150, useNativeDriver: true }),
        Animated.spring(totalPulse, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [totalFine]);

  // Auto-expand categories if searching
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const activeCats: Record<string, boolean> = {};
      violations.forEach(v => {
        if (matchesFuzzy(v.name, v.section, searchQuery)) {
          const cat = getViolationCategory(v);
          activeCats[cat] = true;
        }
      });
      setExpandedCategories(prev => ({
        ...prev,
        ...activeCats
      }));
    }
  }, [searchQuery, violations]);

  // Fetch penalties on mount or when state selection changes
  useEffect(() => {
    const fetchPenalties = async () => {
      setLoading(true);
      setSelectedIds([]); // Clear selection when state changes
      try {
        const response = await executeQuery({
          action: 'get_penalties',
          state: userState,
          language: 'en',
          location: {
            lat: location?.latitude || 0,
            lng: location?.longitude || 0,
            state: userState,
            city: geoInfo?.city || undefined,
            district: geoInfo?.district || undefined,
          }
        } as any);
        if (response.status === 'success' && (response as any).penalties) {
          const dbPenalties = (response as any).penalties;
          const mappedViolations: Violation[] = dbPenalties.map((p: any) => {
            const mapInfo = VIOLATION_MAP[p.violation_type] || {
              name: p.violation_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
              Icon: AlertTriangle,
            };
            const baseFine = parseFine(p.first_offense);
            const secondFine = parseFine(p.second_offense);
            const subsequentFineMultiplier = baseFine > 0 ? (secondFine || baseFine) / baseFine : 1.0;
            
            // Format section nicely
            const sectionText = p.section ? p.section.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Motor Vehicles Act';

            return {
              id: p.id,
              violation_type: p.violation_type,
              name: mapInfo.name,
              section: sectionText.startsWith('Mv') ? sectionText.replace('Mv', 'MV') : sectionText,
              baseFine,
              subsequentFineMultiplier,
              Icon: mapInfo.Icon,
            };
          });
          setViolations(mappedViolations);
        } else {
          setViolations([]);
        }
      } catch (error) {
        console.error('Error fetching penalties:', error);
        setViolations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPenalties();
  }, [userState, location, geoInfo]);

  // Recalculate totals whenever selection or toggles change
  useEffect(() => {
    let base = 0;
    let subsequent = 0;

    selectedIds.forEach((id) => {
      const v = violations.find((item) => item.id === id);
      if (v) {
        base += v.baseFine;
        if (isSubsequent) {
          subsequent += v.baseFine * (v.subsequentFineMultiplier - 1);
        }
      }
    });

    const commercial = isCommercial && selectedIds.length > 0 ? 1000 : 0;
    const subtotal = base + subsequent + commercial;
    const lateFee = isLatePayment ? Math.round(subtotal * 0.1) : 0;

    setBaseSum(base);
    setSubsequentAddition(subsequent);
    setCommercialAddition(commercial);
    setLateFeeAddition(lateFee);
    setTotalFine(subtotal + lateFee);
  }, [selectedIds, isSubsequent, isCommercial, isLatePayment, violations]);

  const toggleViolation = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConsultAI = (violationName: string) => {
    // Navigates to Chat screen and queries about the violation
    navigation.navigate('Chat', { initialQuery: `What is the law and compounding penalty details for ${violationName} in ${userState}?` });
  };

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.03, 0.1, 0.03],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      {/* Premium Header bar */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Calculator size={22} color={COLORS.cyan} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Challan Calculator</Text>
            <Text style={styles.headerSub}>
              <MapPin size={11} color={COLORS.cyan} /> {geoInfo ? getJurisdictionLabel(geoInfo) : getStateName(userState)} Jurisdiction
            </Text>
          </View>
        </View>
        <View style={styles.headerBadge}>
          <ShieldCheck size={12} color={COLORS.success} />
          <Text style={styles.headerBadgeText}>Verified</Text>
        </View>
      </View>

      {loading ? (
        <Animated.View style={[styles.container, styles.loadingContainer, {
          opacity: loadingOpacity,
          transform: [{ scale: loadingScale }],
        }]}>
          <View style={styles.loadingOrbOuter}>
            <View style={styles.loadingOrbInner}>
              <ActivityIndicator size="large" color={COLORS.cyan} />
            </View>
          </View>
          <Text style={styles.loadingTitle}>Loading Traffic Laws</Text>
          <Text style={styles.loadingText}>{geoInfo ? getJurisdictionLabel(geoInfo) : getStateName(userState)} penalty database</Text>
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Animated Total Display Card with shimmer */}
          <Animated.View style={[styles.totalCard, { transform: [{ scale: totalPulse }] }]}>
            {/* Shimmer overlay */}
            <Animated.View style={[styles.shimmerOverlay, { opacity: shimmerOpacity }]} />
            
            <View style={styles.totalCardHeader}>
              <View style={styles.totalCardIcon}>
                <Wallet size={18} color={COLORS.cyan} />
              </View>
              <Text style={styles.totalLabel}>ESTIMATED FINE TOTAL</Text>
            </View>
            
            <Text style={styles.totalValue}>₹{totalFine.toLocaleString()}</Text>
            
            {selectedIds.length > 0 && (
              <View style={styles.breakdownContainer}>
                {/* Visual List of Selected Items to avoid scroll fatigue */}
                <View style={styles.selectedTrayHeader}>
                  <Text style={styles.selectedTrayTitle}>Selected Offenses ({selectedIds.length})</Text>
                  <TouchableOpacity onPress={() => setSelectedIds([])} style={styles.resetButton}>
                    <Text style={styles.resetButtonText}>Reset All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.selectedListTray}>
                  {selectedIds.map((id) => {
                    const v = violations.find((item) => item.id === id);
                    if (!v) return null;
                    return (
                      <View key={id} style={styles.selectedTrayItem}>
                        <View style={styles.selectedTrayItemLeft}>
                          <v.Icon size={14} color={COLORS.cyan} style={{ marginRight: 6 }} />
                          <Text style={styles.selectedTrayItemName} numberOfLines={1}>
                            {v.name}
                          </Text>
                        </View>
                        <View style={styles.selectedTrayItemRight}>
                          <Text style={styles.selectedTrayItemFine}>₹{v.baseFine.toLocaleString()}</Text>
                          <TouchableOpacity onPress={() => toggleViolation(id)} style={styles.removeIconWrapper}>
                            <Trash2 size={13} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.breakdownDivider} />

                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={styles.breakdownLabel}>Base Violations</Text>
                  </View>
                  <Text style={styles.breakdownVal}>₹{baseSum.toLocaleString()}</Text>
                </View>
                {isSubsequent && subsequentAddition > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelRow}>
                      <View style={[styles.breakdownDot, { backgroundColor: COLORS.warning }]} />
                      <Text style={styles.breakdownLabel}>Repeat Offense Multiplier</Text>
                    </View>
                    <Text style={[styles.breakdownVal, { color: COLORS.warning }]}>+₹{subsequentAddition.toLocaleString()}</Text>
                  </View>
                )}
                {isCommercial && commercialAddition > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelRow}>
                      <View style={[styles.breakdownDot, { backgroundColor: COLORS.pending }]} />
                      <Text style={styles.breakdownLabel}>Commercial Surcharge</Text>
                    </View>
                    <Text style={[styles.breakdownVal, { color: COLORS.pending }]}>+₹{commercialAddition.toLocaleString()}</Text>
                  </View>
                )}
                {isLatePayment && lateFeeAddition > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelRow}>
                      <View style={[styles.breakdownDot, { backgroundColor: COLORS.error }]} />
                      <Text style={styles.breakdownLabel}>Late Penalty (10%)</Text>
                    </View>
                    <Text style={[styles.breakdownVal, { color: COLORS.error }]}>+₹{lateFeeAddition.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            )}

            {selectedIds.length === 0 && (
              <Text style={styles.totalHint}>Select violations below to calculate fines</Text>
            )}
          </Animated.View>

          {/* Quick-Tap Grid of Common Fines */}
          {violations.length > 0 && (
            <View style={styles.quickGridContainer}>
              <View style={styles.sectionHeader}>
                <Sparkles size={16} color={COLORS.cyan} />
                <Text style={styles.sectionTitle}>Common Fines (Quick-Tap)</Text>
              </View>
              <View style={styles.quickGrid}>
                {COMMON_VIOLATIONS.map((item) => {
                  const dbMatch = violations.find(v => v.violation_type === item.type);
                  if (!dbMatch) return null;
                  
                  const isSelected = selectedIds.includes(dbMatch.id);
                  return (
                    <TouchableOpacity
                      key={item.type}
                      style={[
                        styles.quickGridCard,
                        isSelected && styles.quickGridCardActive
                      ]}
                      onPress={() => toggleViolation(dbMatch.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.quickGridIconContainer,
                        isSelected && styles.quickGridIconContainerActive
                      ]}>
                        <item.Icon size={18} color={isSelected ? COLORS.primary : COLORS.textSecondary} />
                      </View>
                      <Text style={[
                        styles.quickGridLabel,
                        isSelected && styles.quickGridLabelActive
                      ]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[
                        styles.quickGridFine,
                        isSelected && styles.quickGridFineActive
                      ]}>
                        ₹{dbMatch.baseFine.toLocaleString()}
                      </Text>
                      {isSelected && (
                        <View style={styles.quickGridBadge}>
                          <CheckSquare size={10} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Adjustments & compounding toggles */}
          <View style={styles.adjustmentsContainer}>
            <View style={styles.sectionHeader}>
              <SlidersHorizontal size={18} color={COLORS.cyan} />
              <Text style={styles.sectionTitle}>Compounding Rules</Text>
            </View>
            
            <View style={styles.rowToggle}>
              <View style={styles.toggleIconContainer}>
                <Repeat size={18} color={COLORS.warning} />
              </View>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Subsequent Offense</Text>
                <Text style={styles.toggleSub}>State-specific repeat-offender multipliers</Text>
              </View>
              <Switch
                value={isSubsequent}
                onValueChange={setIsSubsequent}
                trackColor={{ false: COLORS.border, true: 'rgba(245, 158, 11, 0.3)' }}
                thumbColor={isSubsequent ? COLORS.warning : '#f4f3f4'}
              />
            </View>

            <View style={styles.rowToggle}>
              <View style={styles.toggleIconContainer}>
                <Bus size={18} color={COLORS.primary} />
              </View>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Commercial Vehicle</Text>
                <Text style={styles.toggleSub}>Flat +₹1,000 commercial enforcement penalty</Text>
              </View>
              <Switch
                value={isCommercial}
                onValueChange={setIsCommercial}
                trackColor={{ false: COLORS.border, true: 'rgba(37, 99, 235, 0.3)' }}
                thumbColor={isCommercial ? COLORS.primary : '#f4f3f4'}
              />
            </View>

            <View style={[styles.rowToggle, { borderBottomWidth: 0 }]}>
              <View style={styles.toggleIconContainer}>
                <Clock size={18} color={COLORS.error} />
              </View>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Late Payment (&gt;30 Days)</Text>
                <Text style={styles.toggleSub}>10% compounding fee penalty</Text>
              </View>
              <Switch
                value={isLatePayment}
                onValueChange={setIsLatePayment}
                trackColor={{ false: COLORS.border, true: 'rgba(239, 68, 68, 0.3)' }}
                thumbColor={isLatePayment ? COLORS.error : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Violations Search and Suggestion Chips */}
          {violations.length > 0 && (
            <View style={styles.filterSection}>
              {/* Premium Search Bar */}
              <View style={styles.searchBarWrapper}>
                <Search size={18} color={COLORS.textSecondary} style={styles.searchBarIcon} />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder="Search by law, violation, keywords..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchBarClear}>
                    <X size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Suggestion Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryScrollContent}
              >
                <TouchableOpacity
                  style={[styles.categoryPill, activeCategory === 'All' && styles.categoryPillActive]}
                  onPress={() => {
                    setActiveCategory('All');
                    setSearchQuery('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryPillText, activeCategory === 'All' && styles.categoryPillTextActive]}>
                    Show All
                  </Text>
                </TouchableOpacity>
                {SUGGESTION_TAGS.map((tag) => {
                  const isActive = searchQuery.toLowerCase() === tag.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                      onPress={() => setSearchQuery(isActive ? '' : tag)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Violations Category Accordions */}
          <View style={styles.sectionHeader}>
            <List size={18} color={COLORS.cyan} />
            <Text style={styles.sectionTitle}>Full Penalty Database</Text>
            {violations.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{selectedIds.length}/{violations.length}</Text>
              </View>
            )}
          </View>
          
          {violations.length === 0 ? (
            <View style={styles.noViolationsContainer}>
              <View style={styles.noViolationsIcon}>
                <AlertCircle size={36} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.noViolationsTitle}>No Laws Found</Text>
              <Text style={styles.loadingText}>No structured laws found for {geoInfo ? getJurisdictionLabel(geoInfo) : getStateName(userState)} in the local database.</Text>
            </View>
          ) : filteredViolations.length === 0 ? (
            <View style={styles.noViolationsContainer}>
              <View style={styles.noViolationsIcon}>
                <AlertCircle size={36} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.noViolationsTitle}>No Match Found</Text>
              <Text style={styles.loadingText}>No traffic violations matched your search query.</Text>
            </View>
          ) : (
            // Group and render accordions
            ['Safety', 'Documents', 'Other'].map((cat) => {
              const catViolations = filteredViolations.filter(v => getViolationCategory(v) === cat);
              if (catViolations.length === 0) return null;
              
              const isExpanded = expandedCategories[cat];
              const selectedInCat = catViolations.filter(v => selectedIds.includes(v.id)).length;
              
              // Icon mapping for header
              const CatIcon = cat === 'Safety' ? HardHat : cat === 'Documents' ? FileText : AlertTriangle;
              const catTitle = cat === 'Safety' ? 'Driver & Rider Safety' : cat === 'Documents' ? 'License & Documentation' : 'General & Loading';
              
              return (
                <View key={cat} style={styles.accordionContainer}>
                  {/* Accordion Header */}
                  <TouchableOpacity
                    style={[styles.accordionHeader, isExpanded && styles.accordionHeaderActive]}
                    onPress={() => toggleCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <View style={styles.accordionIconCircle}>
                        <CatIcon size={16} color={isExpanded ? COLORS.primary : COLORS.textSecondary} />
                      </View>
                      <Text style={[styles.accordionTitle, isExpanded && styles.accordionTitleActive]}>
                        {catTitle}
                      </Text>
                      <Text style={styles.accordionCount}>({catViolations.length})</Text>
                    </View>
                    
                    <View style={styles.accordionHeaderRight}>
                      {selectedInCat > 0 && (
                        <View style={styles.accordionSelectedBadge}>
                          <Text style={styles.accordionSelectedBadgeText}>{selectedInCat} active</Text>
                        </View>
                      )}
                      {isExpanded ? (
                        <ChevronDown size={18} color={COLORS.textSecondary} />
                      ) : (
                        <ChevronRight size={18} color={COLORS.textSecondary} />
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  {/* Accordion Content */}
                  {isExpanded && (
                    <View style={styles.accordionContent}>
                      {catViolations.map((violation) => {
                        const isSelected = selectedIds.includes(violation.id);
                        return (
                          <TouchableOpacity
                            key={violation.id}
                            style={[
                              styles.violationItem,
                              isSelected && styles.violationItemSelected,
                            ]}
                            onPress={() => toggleViolation(violation.id)}
                            activeOpacity={0.85}
                          >
                            <View style={styles.violationMain}>
                              <View style={[
                                styles.violationIconCircle,
                                isSelected && styles.violationIconCircleSelected,
                              ]}>
                                <violation.Icon
                                  size={20}
                                  color={isSelected ? COLORS.primary : COLORS.textSecondary}
                                />
                              </View>
                              
                              <View style={styles.violationInfo}>
                                <Text style={[
                                  styles.violationName,
                                  isSelected && { color: COLORS.primary, fontWeight: '700' },
                                ]}>{violation.name}</Text>
                                <View style={styles.violationSubRow}>
                                  <Text style={styles.violationSection}>{violation.section}</Text>
                                  <View style={styles.fineBadge}>
                                    <Text style={[
                                      styles.violationFine,
                                      isSelected && { color: COLORS.primary },
                                    ]}>₹{violation.baseFine.toLocaleString()}</Text>
                                  </View>
                                </View>
                              </View>
          
                              <View style={styles.violationRight}>
                                {isSelected ? (
                                  <CheckSquare size={22} color={COLORS.primary} />
                                ) : (
                                  <Square size={22} color={COLORS.border} />
                                )}
                              </View>
                            </View>
          
                            {/* AI Consult strip */}
                            {isSelected && (
                              <TouchableOpacity
                                style={styles.aiConsultStrip}
                                onPress={() => handleConsultAI(violation.name)}
                                activeOpacity={0.7}
                              >
                                <Sparkles size={13} color={COLORS.cyan} />
                                <Text style={styles.aiConsultText}>Ask TrafiAI about this violation</Text>
                                <ChevronRight size={13} color={COLORS.cyan} />
                              </TouchableOpacity>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.large,
    paddingHorizontal: 12,
    height: 48,
    position: 'relative',
  },
  searchBarIcon: {
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  searchBarClear: {
    padding: 4,
    position: 'absolute',
    right: 12,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginTop: 2,
  },
  categoryScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: COLORS.cyan,
  },
  categoryPillText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: COLORS.cyan,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  loadingOrbOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  loadingOrbInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: 8,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  noViolationsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  noViolationsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noViolationsTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    borderBottomColor: 'rgba(6, 182, 212, 0.15)',
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
    ...GLASS.cyan,
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
    color: COLORS.cyan,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    ...GLASS.light,
  },
  headerBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Premium Total Card
  totalCard: {
    backgroundColor: COLORS.navy,
    borderRadius: BORDER_RADIUS.large,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.strong,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 182, 212, 0.5)',
    borderRadius: BORDER_RADIUS.large,
  },
  totalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  totalCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
    letterSpacing: 1.5,
    fontSize: 11,
  },
  totalValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    marginVertical: 8,
    letterSpacing: -1,
  },
  totalHint: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 4,
  },
  breakdownContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
    marginTop: 10,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  breakdownLabel: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  breakdownVal: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  // Adjustments Section
  adjustmentsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 24,
    ...SHADOWS.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.lightPrimary,
  },
  countBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  rowToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  toggleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
    fontSize: 11,
  },
  // Violation Cards
  violationItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    ...SHADOWS.subtle,
    overflow: 'hidden',
  },
  violationItemSelected: {
    borderColor: 'rgba(37, 99, 235, 0.35)',
    backgroundColor: COLORS.lightPrimary,
    ...SHADOWS.medium,
  },
  violationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  violationIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  violationIconCircleSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  violationInfo: {
    flex: 1,
  },
  violationName: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  violationSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  violationSection: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  fineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: COLORS.background,
  },
  violationFine: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  violationRight: {
    paddingLeft: 4,
  },
  aiConsultStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(37, 99, 235, 0.12)',
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
  },
  aiConsultText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.cyan,
    fontWeight: '600',
    flex: 1,
    fontSize: 12,
  },
  // Quick Grid styles
  quickGridContainer: {
    marginBottom: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  quickGridCard: {
    width: '31.3%', // roughly 3 columns
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.subtle,
  },
  quickGridCardActive: {
    borderColor: 'rgba(37, 99, 235, 0.4)',
    backgroundColor: COLORS.lightPrimary,
    ...SHADOWS.medium,
  },
  quickGridIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickGridIconContainerActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  quickGridLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontSize: 11,
    marginBottom: 4,
  },
  quickGridLabelActive: {
    color: COLORS.primary,
  },
  quickGridFine: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quickGridFineActive: {
    color: COLORS.primary,
  },
  quickGridBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Selected tray in total card styles
  selectedTrayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedTrayTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
  },
  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resetButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: '#FCA5A5',
    fontSize: 10,
  },
  selectedListTray: {
    maxHeight: 150, // scrollable if too many
    width: '100%',
    gap: 6,
  },
  selectedTrayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectedTrayItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedTrayItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTrayItemName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  selectedTrayItemFine: {
    ...TYPOGRAPHY.caption,
    color: COLORS.cyan,
    fontWeight: '700',
    fontSize: 12,
  },
  removeIconWrapper: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
    width: '100%',
  },

  // Accordion styles
  accordionContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
  },
  accordionHeaderActive: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(6, 182, 212, 0.02)',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  accordionTitleActive: {
    color: COLORS.primary,
  },
  accordionCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  accordionSelectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.lightPrimary,
  },
  accordionSelectedBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  accordionContent: {
    padding: 10,
    backgroundColor: COLORS.background,
    gap: 8,
  },
});
