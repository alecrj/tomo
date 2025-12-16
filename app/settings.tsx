import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, DollarSign, Utensils, Heart, Users, Check, Navigation, Brain } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useOnboardingStore } from '../stores/useOnboardingStore';
import { useConversationStore } from '../stores/useConversationStore';
import { useMemoryStore } from '../stores/useMemoryStore';
import { detectCurrency } from '../utils/currency';
import * as Location from 'expo-location';

/**
 * Settings Screen
 * Configure preferences, budget, dietary restrictions, interests
 */
export default function SettingsScreen() {
  const router = useRouter();

  // Store state
  const preferences = usePreferencesStore();
  const budget = useBudgetStore();
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);

  // Detect currency from GPS location
  const currency = useMemo(() => {
    if (coordinates) {
      return detectCurrency(coordinates);
    }
    return { code: 'USD', symbol: '$', name: 'US Dollar' };
  }, [coordinates]);

  // Local state for editing
  const [homeBaseName, setHomeBaseName] = useState(preferences.homeBase?.name || '');
  const [homeBaseAddress, setHomeBaseAddress] = useState(preferences.homeBase?.address || '');
  const [homeBaseCoordinates, setHomeBaseCoordinates] = useState(preferences.homeBase?.coordinates);
  const [tripBudget, setTripBudget] = useState(budget.tripTotal?.toString() || '');
  const [tripDays, setTripDays] = useState(budget.tripDays?.toString() || '7');
  const [walkingTolerance, setWalkingTolerance] = useState(preferences.walkingTolerance);
  const [budgetLevel, setBudgetLevel] = useState(preferences.budgetLevel);
  const [avoidCrowds, setAvoidCrowds] = useState(preferences.avoidCrowds);

  // Dietary restrictions (multi-select)
  const [dietary, setDietary] = useState<Set<string>>(new Set(preferences.dietary));
  const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'none'];

  // Interests (multi-select)
  const [interests, setInterests] = useState<Set<string>>(new Set(preferences.interests));
  const interestOptions = ['food', 'culture', 'nightlife', 'nature', 'shopping', 'iconic'];

  const toggleDietary = (option: string) => {
    const newDietary = new Set(dietary);
    if (option === 'none') {
      newDietary.clear();
      newDietary.add('none');
    } else {
      newDietary.delete('none');
      if (newDietary.has(option)) {
        newDietary.delete(option);
      } else {
        newDietary.add(option);
      }
    }
    setDietary(newDietary);
  };

  const toggleInterest = (option: string) => {
    const newInterests = new Set(interests);
    if (newInterests.has(option)) {
      newInterests.delete(option);
    } else {
      newInterests.add(option);
    }
    setInterests(newInterests);
  };

  const handleUseCurrentLocation = async () => {
    if (!coordinates) {
      Alert.alert('Location Not Available', 'Please enable location services and try again.');
      return;
    }

    // Get address from current location
    try {
      const [geocode] = await Location.reverseGeocodeAsync(coordinates);
      if (geocode) {
        const address = [
          geocode.street,
          geocode.district || geocode.subregion,
          geocode.city,
        ].filter(Boolean).join(', ');

        setHomeBaseName(neighborhood || 'Current Location');
        setHomeBaseAddress(address || neighborhood || 'Current Location');
        setHomeBaseCoordinates(coordinates);

        Alert.alert('Location Set', 'Your current location has been set as your home base.');
      }
    } catch (error) {
      console.error('Error geocoding:', error);
      // Fallback to just using coordinates
      setHomeBaseName(neighborhood || 'Current Location');
      setHomeBaseAddress(neighborhood || 'Current Location');
      setHomeBaseCoordinates(coordinates);

      Alert.alert('Location Set', 'Your current location has been set as your home base.');
    }
  };

  const handleSave = () => {
    // Validate required fields
    if (!homeBaseName || !homeBaseAddress) {
      Alert.alert('Missing Information', 'Please set your home base location.');
      return;
    }

    if (!tripBudget || !tripDays) {
      Alert.alert('Missing Information', 'Please set your trip budget and duration.');
      return;
    }

    if (interests.size === 0) {
      Alert.alert('Missing Information', 'Please select at least one interest.');
      return;
    }

    // Save to stores
    preferences.setHomeBase({
      name: homeBaseName,
      address: homeBaseAddress,
      coordinates: homeBaseCoordinates || coordinates || { latitude: 0, longitude: 0 },
    });

    preferences.setWalkingTolerance(walkingTolerance);
    preferences.setBudgetLevel(budgetLevel);
    preferences.setAvoidCrowds(avoidCrowds);

    // Update dietary restrictions
    const currentDietary = preferences.dietary;
    const newDietary = Array.from(dietary).filter(d => d !== 'none');

    // Remove old restrictions not in new set
    currentDietary.forEach(restriction => {
      if (!newDietary.includes(restriction)) {
        preferences.removeDietaryRestriction(restriction);
      }
    });

    // Add new restrictions not in current set
    newDietary.forEach(restriction => {
      if (!currentDietary.includes(restriction)) {
        preferences.addDietaryRestriction(restriction);
      }
    });

    // Update interests
    const currentInterests = preferences.interests;
    const newInterests = Array.from(interests);

    // Remove old interests not in new set
    currentInterests.forEach(interest => {
      if (!newInterests.includes(interest)) {
        preferences.removeInterest(interest);
      }
    });

    // Add new interests not in current set
    newInterests.forEach(interest => {
      if (!currentInterests.includes(interest)) {
        preferences.addInterest(interest);
      }
    });

    budget.setTripBudget(parseInt(tripBudget, 10), parseInt(tripDays, 10));

    Alert.alert('Settings Saved', 'Your preferences have been updated.', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.light.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Memory Link */}
          <TouchableOpacity
            style={styles.memoryLink}
            onPress={() => router.push('/memory')}
          >
            <View style={styles.memoryLinkContent}>
              <Brain size={24} color="#007AFF" />
              <View style={styles.memoryLinkText}>
                <Text style={styles.memoryLinkTitle}>Memory</Text>
                <Text style={styles.memoryLinkDescription}>
                  View and manage things Tomo remembers about you
                </Text>
              </View>
            </View>
            <Text style={styles.memoryLinkArrow}>›</Text>
          </TouchableOpacity>

          {/* Home Base Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color={colors.text.light.primary} />
              <Text style={styles.sectionTitle}>Home Base</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Where you're staying. Used for last train warnings and "take me home" directions.
            </Text>

            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
            >
              <Navigation size={18} color="#007AFF" />
              <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Shinjuku Station Hotel"
                placeholderTextColor={colors.text.light.tertiary}
                value={homeBaseName}
                onChangeText={setHomeBaseName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 3-38-1 Shinjuku, Tokyo"
                placeholderTextColor={colors.text.light.tertiary}
                value={homeBaseAddress}
                onChangeText={setHomeBaseAddress}
              />
            </View>
          </View>

          {/* Budget Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color={colors.text.light.primary} />
              <Text style={styles.sectionTitle}>Budget</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Your total trip budget. Daily budget is calculated automatically.
            </Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.inputLabel}>Total Budget ({currency.symbol})</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="70000"
                  placeholderTextColor={colors.text.light.tertiary}
                  value={tripBudget}
                  onChangeText={setTripBudget}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.inputLabel}>Trip Days</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="7"
                  placeholderTextColor={colors.text.light.tertiary}
                  value={tripDays}
                  onChangeText={setTripDays}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {tripBudget && tripDays && parseInt(tripBudget) > 0 && parseInt(tripDays) > 0 && (
              <View style={styles.budgetPreview}>
                <Text style={styles.budgetPreviewText}>
                  Daily Budget: {currency.symbol}{Math.floor(parseInt(tripBudget) / parseInt(tripDays)).toLocaleString()}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Budget Level</Text>
            <View style={styles.chipGroup}>
              {(['budget', 'moderate', 'luxury'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.chip, budgetLevel === level && styles.chipSelected]}
                  onPress={() => setBudgetLevel(level)}
                >
                  <Text style={[styles.chipText, budgetLevel === level && styles.chipTextSelected]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Walking Tolerance Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color={colors.text.light.primary} />
              <Text style={styles.sectionTitle}>Walking Tolerance</Text>
            </View>
            <Text style={styles.sectionDescription}>
              How far you're willing to walk. Affects destination suggestions.
            </Text>

            <View style={styles.chipGroup}>
              {(['low', 'medium', 'high'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.chip, walkingTolerance === level && styles.chipSelected]}
                  onPress={() => setWalkingTolerance(level)}
                >
                  <Text style={[styles.chipText, walkingTolerance === level && styles.chipTextSelected]}>
                    {level === 'low' ? '< 10 min' : level === 'medium' ? '10-20 min' : '> 20 min'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dietary Restrictions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Utensils size={20} color={colors.text.light.primary} />
              <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
            </View>

            <View style={styles.chipGroup}>
              {dietaryOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, dietary.has(option) && styles.chipSelected]}
                  onPress={() => toggleDietary(option)}
                >
                  {dietary.has(option) && (
                    <Check size={16} color={colors.surface.card} style={styles.chipIcon} />
                  )}
                  <Text style={[styles.chipText, dietary.has(option) && styles.chipTextSelected]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Interests Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Heart size={20} color={colors.text.light.primary} />
              <Text style={styles.sectionTitle}>Interests</Text>
            </View>
            <Text style={styles.sectionDescription}>
              What you're interested in. Influences destination recommendations.
            </Text>

            <View style={styles.chipGroup}>
              {interestOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, interests.has(option) && styles.chipSelected]}
                  onPress={() => toggleInterest(option)}
                >
                  {interests.has(option) && (
                    <Check size={16} color={colors.surface.card} style={styles.chipIcon} />
                  )}
                  <Text style={[styles.chipText, interests.has(option) && styles.chipTextSelected]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Other Preferences Section */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Avoid Crowds</Text>
                <Text style={styles.settingDescription}>
                  Prefer less touristy spots
                </Text>
              </View>
              <Switch
                value={avoidCrowds}
                onValueChange={setAvoidCrowds}
                trackColor={{ false: colors.surface.input, true: colors.interactive.primary }}
                thumbColor={colors.surface.card}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>

          {/* Developer Options */}
          <View style={styles.devSection}>
            <Text style={styles.devSectionTitle}>Developer Options</Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                Alert.alert(
                  'Reset App',
                  'This will clear all data and restart the onboarding flow. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: () => {
                        useOnboardingStore.getState().resetOnboarding();
                        useConversationStore.getState().clearAll();
                        useMemoryStore.getState().clearMemories();
                        router.replace('/onboarding');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.resetButtonText}>Reset Onboarding & Data</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.card,
    ...shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  memoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  memoryLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  memoryLinkText: {
    flex: 1,
  },
  memoryLinkTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginBottom: 4,
  },
  memoryLinkDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    lineHeight: 18,
  },
  memoryLinkArrow: {
    fontSize: 28,
    color: colors.text.light.tertiary,
    marginLeft: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginLeft: spacing.sm,
  },
  sectionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  currentLocationButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: '#007AFF',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface.input,
    borderRadius: 8,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.light.primary,
  },
  budgetPreview: {
    backgroundColor: colors.surface.input,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  budgetPreviewText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    textAlign: 'center',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface.input,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.interactive.primary,
    borderColor: colors.interactive.primary,
  },
  chipIcon: {
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
  },
  chipTextSelected: {
    color: colors.surface.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
  },
  saveButton: {
    backgroundColor: colors.interactive.primary,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  saveButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.surface.card,
  },
  bottomPadding: {
    height: spacing.xl,
  },
  devSection: {
    marginTop: spacing.xl * 2,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  devSectionTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  resetButton: {
    backgroundColor: '#FFF1F0',
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCCC7',
  },
  resetButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: '#FF4D4F',
  },
});
