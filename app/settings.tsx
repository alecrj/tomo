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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { ArrowLeft, MapPin, DollarSign, Utensils, Heart, Users, Check, Navigation, Brain, Thermometer, MessageCircle, Bell, Smile, AlignLeft, Train, Clock, CloudRain, Wallet, Calendar, Globe } from 'lucide-react-native';
import { colors, spacing, typography, shadows, borders } from '../constants/theme';
import { usePreferencesStore, TomoTone, EmojiUsage, ResponseLength, Language, LANGUAGE_NAMES } from '../stores/usePreferencesStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useOnboardingStore } from '../stores/useOnboardingStore';
import { useConversationStore } from '../stores/useConversationStore';
import { useMemoryStore } from '../stores/useMemoryStore';
import { detectCurrency } from '../utils/currency';
import * as Location from 'expo-location';

export default function SettingsScreen() {
  const router = useRouter();

  const preferences = usePreferencesStore();
  const budget = useBudgetStore();
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);

  const currency = useMemo(() => {
    if (coordinates) {
      return detectCurrency(coordinates);
    }
    return { code: 'USD', symbol: '$', name: 'US Dollar' };
  }, [coordinates]);

  const [homeBaseName, setHomeBaseName] = useState(preferences.homeBase?.name || '');
  const [homeBaseAddress, setHomeBaseAddress] = useState(preferences.homeBase?.address || '');
  const [homeBaseCoordinates, setHomeBaseCoordinates] = useState(preferences.homeBase?.coordinates);
  const [tripBudget, setTripBudget] = useState(budget.tripTotal?.toString() || '');
  const [tripDays, setTripDays] = useState(budget.tripDays?.toString() || '7');
  const [walkingTolerance, setWalkingTolerance] = useState(preferences.walkingTolerance);
  const [budgetLevel, setBudgetLevel] = useState(preferences.budgetLevel);
  const [avoidCrowds, setAvoidCrowds] = useState(preferences.avoidCrowds);

  const [dietary, setDietary] = useState<Set<string>>(new Set(preferences.dietary));
  const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'none'];
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>(preferences.temperatureUnit);
  const [language, setLanguage] = useState<Language>(preferences.language);

  const [interests, setInterests] = useState<Set<string>>(new Set(preferences.interests));
  const interestOptions = ['food', 'culture', 'nightlife', 'nature', 'shopping', 'iconic'];

  // Tomo Personality
  const [tomoTone, setTomoTone] = useState<TomoTone>(preferences.tomoTone);
  const [emojiUsage, setEmojiUsage] = useState<EmojiUsage>(preferences.emojiUsage);
  const [responseLength, setResponseLength] = useState<ResponseLength>(preferences.responseLength);

  // Notification preferences
  const [lastTrainWarnings, setLastTrainWarnings] = useState(preferences.lastTrainWarnings);
  const [placeClosingWarnings, setPlaceClosingWarnings] = useState(preferences.placeClosingWarnings);
  const [weatherAlerts, setWeatherAlerts] = useState(preferences.weatherAlerts);
  const [budgetAlerts, setBudgetAlerts] = useState(preferences.budgetAlerts);
  const [itineraryReminders, setItineraryReminders] = useState(preferences.itineraryReminders);

  const toggleDietary = (option: string) => {
    safeHaptics.selection();
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
    safeHaptics.selection();
    const newInterests = new Set(interests);
    if (newInterests.has(option)) {
      newInterests.delete(option);
    } else {
      newInterests.add(option);
    }
    setInterests(newInterests);
  };

  const handleUseCurrentLocation = async () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);

    if (!coordinates) {
      Alert.alert('Location Not Available', 'Please enable location services and try again.');
      return;
    }

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
      setHomeBaseName(neighborhood || 'Current Location');
      setHomeBaseAddress(neighborhood || 'Current Location');
      setHomeBaseCoordinates(coordinates);

      Alert.alert('Location Set', 'Your current location has been set as your home base.');
    }
  };

  const handleSave = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Heavy);

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

    preferences.setHomeBase({
      name: homeBaseName,
      address: homeBaseAddress,
      coordinates: homeBaseCoordinates || coordinates || { latitude: 0, longitude: 0 },
    });

    preferences.setWalkingTolerance(walkingTolerance);
    preferences.setBudgetLevel(budgetLevel);
    preferences.setAvoidCrowds(avoidCrowds);
    preferences.setTemperatureUnit(temperatureUnit);
    preferences.setLanguage(language);
    preferences.setTomoTone(tomoTone);
    preferences.setEmojiUsage(emojiUsage);
    preferences.setResponseLength(responseLength);
    preferences.setLastTrainWarnings(lastTrainWarnings);
    preferences.setPlaceClosingWarnings(placeClosingWarnings);
    preferences.setWeatherAlerts(weatherAlerts);
    preferences.setBudgetAlerts(budgetAlerts);
    preferences.setItineraryReminders(itineraryReminders);

    const currentDietary = preferences.dietary;
    const newDietary = Array.from(dietary).filter(d => d !== 'none');

    currentDietary.forEach(restriction => {
      if (!newDietary.includes(restriction)) {
        preferences.removeDietaryRestriction(restriction);
      }
    });

    newDietary.forEach(restriction => {
      if (!currentDietary.includes(restriction)) {
        preferences.addDietaryRestriction(restriction);
      }
    });

    const currentInterests = preferences.interests;
    const newInterests = Array.from(interests);

    currentInterests.forEach(interest => {
      if (!newInterests.includes(interest)) {
        preferences.removeInterest(interest);
      }
    });

    newInterests.forEach(interest => {
      if (!currentInterests.includes(interest)) {
        preferences.addInterest(interest);
      }
    });

    budget.setTripBudget(parseInt(tripBudget, 10), parseInt(tripDays, 10));

    safeHaptics.notification(NotificationFeedbackType.Success);
    Alert.alert('Settings Saved', 'Your preferences have been updated.', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.content} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              safeHaptics.impact(ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <ArrowLeft size={24} color={colors.text.primary} />
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
            onPress={() => {
              safeHaptics.impact(ImpactFeedbackStyle.Light);
              router.push('/memory');
            }}
          >
            <View style={styles.memoryLinkContent}>
              <Brain size={24} color={colors.accent.primary} />
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
              <MapPin size={20} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Home Base</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Where you're staying. Used for last train warnings and "take me home" directions.
            </Text>

            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
            >
              <Navigation size={18} color={colors.accent.primary} />
              <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Shinjuku Station Hotel"
                placeholderTextColor={colors.text.tertiary}
                value={homeBaseName}
                onChangeText={setHomeBaseName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 3-38-1 Shinjuku, Tokyo"
                placeholderTextColor={colors.text.tertiary}
                value={homeBaseAddress}
                onChangeText={setHomeBaseAddress}
              />
            </View>
          </View>

          {/* Budget Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color={colors.accent.primary} />
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
                  placeholderTextColor={colors.text.tertiary}
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
                  placeholderTextColor={colors.text.tertiary}
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
                  onPress={() => {
                    safeHaptics.selection();
                    setBudgetLevel(level);
                  }}
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
              <Users size={20} color={colors.accent.primary} />
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
                  onPress={() => {
                    safeHaptics.selection();
                    setWalkingTolerance(level);
                  }}
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
              <Utensils size={20} color={colors.accent.primary} />
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
                    <Check size={16} color={colors.text.inverse} style={styles.chipIcon} />
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
              <Heart size={20} color={colors.accent.primary} />
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
                    <Check size={16} color={colors.text.inverse} style={styles.chipIcon} />
                  )}
                  <Text style={[styles.chipText, interests.has(option) && styles.chipTextSelected]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tomo Personality Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MessageCircle size={20} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Tomo's Personality</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Customize how Tomo talks to you.
            </Text>

            <Text style={styles.inputLabel}>Tone</Text>
            <View style={styles.chipGroup}>
              {(['casual', 'friendly', 'professional'] as const).map((tone) => (
                <TouchableOpacity
                  key={tone}
                  style={[styles.chip, tomoTone === tone && styles.chipSelected]}
                  onPress={() => {
                    safeHaptics.selection();
                    setTomoTone(tone);
                  }}
                >
                  <Text style={[styles.chipText, tomoTone === tone && styles.chipTextSelected]}>
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Emoji Usage</Text>
            <View style={styles.chipGroup}>
              {(['lots', 'some', 'none'] as const).map((usage) => (
                <TouchableOpacity
                  key={usage}
                  style={[styles.chip, emojiUsage === usage && styles.chipSelected]}
                  onPress={() => {
                    safeHaptics.selection();
                    setEmojiUsage(usage);
                  }}
                >
                  <Text style={[styles.chipText, emojiUsage === usage && styles.chipTextSelected]}>
                    {usage === 'lots' ? 'Lots' : usage === 'some' ? 'Some' : 'None'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Response Length</Text>
            <View style={styles.chipGroup}>
              {(['brief', 'balanced', 'detailed'] as const).map((length) => (
                <TouchableOpacity
                  key={length}
                  style={[styles.chip, responseLength === length && styles.chipSelected]}
                  onPress={() => {
                    safeHaptics.selection();
                    setResponseLength(length);
                  }}
                >
                  <Text style={[styles.chipText, responseLength === length && styles.chipTextSelected]}>
                    {length.charAt(0).toUpperCase() + length.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notification Preferences Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Choose what alerts you want to receive.
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingIconLabel}>
                <Train size={18} color={colors.text.secondary} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Last Train Warnings</Text>
                  <Text style={styles.settingDescription}>Alert when last train is approaching</Text>
                </View>
              </View>
              <Switch
                value={lastTrainWarnings}
                onValueChange={(value) => {
                  safeHaptics.selection();
                  setLastTrainWarnings(value);
                }}
                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingIconLabel}>
                <Clock size={18} color={colors.text.secondary} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Place Closing Warnings</Text>
                  <Text style={styles.settingDescription}>Alert when a place is closing soon</Text>
                </View>
              </View>
              <Switch
                value={placeClosingWarnings}
                onValueChange={(value) => {
                  safeHaptics.selection();
                  setPlaceClosingWarnings(value);
                }}
                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingIconLabel}>
                <CloudRain size={18} color={colors.text.secondary} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Weather Alerts</Text>
                  <Text style={styles.settingDescription}>Alert for incoming rain or weather changes</Text>
                </View>
              </View>
              <Switch
                value={weatherAlerts}
                onValueChange={(value) => {
                  safeHaptics.selection();
                  setWeatherAlerts(value);
                }}
                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingIconLabel}>
                <Wallet size={18} color={colors.text.secondary} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Budget Alerts</Text>
                  <Text style={styles.settingDescription}>Alert when approaching budget limit</Text>
                </View>
              </View>
              <Switch
                value={budgetAlerts}
                onValueChange={(value) => {
                  safeHaptics.selection();
                  setBudgetAlerts(value);
                }}
                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingIconLabel}>
                <Calendar size={18} color={colors.text.secondary} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Itinerary Reminders</Text>
                  <Text style={styles.settingDescription}>Remind you of upcoming activities</Text>
                </View>
              </View>
              <Switch
                value={itineraryReminders}
                onValueChange={(value) => {
                  safeHaptics.selection();
                  setItineraryReminders(value);
                }}
                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
              />
            </View>
          </View>

          {/* Language Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Language</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Tomo will speak and respond in this language.
            </Text>

            <View style={styles.chipGroup}>
              {(Object.keys(LANGUAGE_NAMES) as Language[]).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.chip, language === lang && styles.chipSelected]}
                  onPress={() => {
                    safeHaptics.selection();
                    setLanguage(lang);
                  }}
                >
                  {language === lang && (
                    <Check size={16} color={colors.text.inverse} style={styles.chipIcon} />
                  )}
                  <Text style={[styles.chipText, language === lang && styles.chipTextSelected]}>
                    {LANGUAGE_NAMES[lang]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Other Preferences Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Thermometer size={20} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Temperature Unit</Text>
            </View>
            <View style={styles.chipGroup}>
              {(['C', 'F'] as const).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.chip, temperatureUnit === unit && styles.chipSelected]}
                  onPress={() => {
                    safeHaptics.selection();
                    setTemperatureUnit(unit);
                  }}
                >
                  <Text style={[styles.chipText, temperatureUnit === unit && styles.chipTextSelected]}>
                    {unit === 'C' ? '°C (Celsius)' : '°F (Fahrenheit)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.settingRow, { marginTop: spacing.lg }]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Avoid Crowds</Text>
                <Text style={styles.settingDescription}>
                  Prefer less touristy spots
                </Text>
              </View>
              <Switch
                value={avoidCrowds}
                onValueChange={(value) => {
                  safeHaptics.selection();
                  setAvoidCrowds(value);
                }}
                trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
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
                safeHaptics.impact(ImpactFeedbackStyle.Heavy);
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
    backgroundColor: colors.background.primary,
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
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
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
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  memoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
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
    color: colors.text.primary,
    marginBottom: 4,
  },
  memoryLinkDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  memoryLinkArrow: {
    fontSize: 28,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
  section: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  sectionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.muted,
    borderRadius: borders.radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  currentLocationButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent.primary,
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
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  budgetPreview: {
    backgroundColor: colors.accent.muted,
    borderRadius: borders.radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  budgetPreviewText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.accent.primary,
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
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  chipIcon: {
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  chipTextSelected: {
    color: colors.text.inverse,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  settingIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  bottomPadding: {
    height: spacing.xl,
  },
  devSection: {
    marginTop: spacing.xl * 2,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  devSectionTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  resetButton: {
    backgroundColor: colors.status.errorMuted,
    borderRadius: borders.radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.status.error,
  },
  resetButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.status.error,
  },
});
