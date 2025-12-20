import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Mic, ArrowRight, Globe, Compass, MessageSquare, Check, Languages } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { colors, spacing, borders, shadows } from '../constants/theme';
import { useOnboardingStore } from '../stores/useOnboardingStore';
import { usePreferencesStore, Language, LANGUAGE_NAMES } from '../stores/usePreferencesStore';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  action: () => Promise<void>;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const fadeAnim = useState(new Animated.Value(1))[0];

  const {
    completeOnboarding,
    setLocationPermission,
    setMicrophonePermission,
  } = useOnboardingStore();

  const { setLanguage } = usePreferencesStore();

  const requestLocation = async () => {
    setIsLoading(true);
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status === 'granted') {
        safeHaptics.notification(NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
    setIsLoading(false);
    goToNextStep();
  };

  const requestMicrophone = async () => {
    setIsLoading(true);
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setMicrophonePermission(status === 'granted');
      if (status === 'granted') {
        safeHaptics.notification(NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Microphone permission error:', error);
    }
    setIsLoading(false);
    goToNextStep();
  };

  const saveLanguage = async () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    setLanguage(selectedLanguage);
    goToNextStep();
  };

  const finishOnboarding = async () => {
    safeHaptics.notification(NotificationFeedbackType.Success);
    completeOnboarding();
    router.replace('/');
  };

  const goToNextStep = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 150);
  };

  const steps: OnboardingStep[] = [
    {
      icon: <Languages size={64} color={colors.accent.primary} />,
      title: 'Choose Your Language',
      description:
        "Tomo will speak and respond in your preferred language. You can always change this later in settings.",
      buttonText: 'Continue',
      action: saveLanguage,
    },
    {
      icon: <MapPin size={64} color={colors.status.success} />,
      title: 'Location Access',
      description:
        "Tomo needs to know where you are to give you relevant recommendations. We'll never share your location data.",
      buttonText: 'Enable Location',
      action: requestLocation,
    },
    {
      icon: <Mic size={64} color={colors.status.warning} />,
      title: 'Voice Input',
      description:
        'Talk to Tomo naturally! Voice input makes it easy to ask questions while exploring.',
      buttonText: 'Enable Microphone',
      action: requestMicrophone,
    },
    {
      icon: <MessageSquare size={64} color={colors.accent.primary} />,
      title: "You're All Set!",
      description:
        "Start chatting with Tomo. Ask for food recommendations, directions, or anything about your trip!",
      buttonText: 'Start Exploring',
      action: finishOnboarding,
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress dots */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
                index < currentStep && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Step content */}
        <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>{currentStepData.icon}</View>

          <Text style={styles.title}>{currentStepData.title}</Text>
          <Text style={styles.description}>{currentStepData.description}</Text>
        </Animated.View>

        {/* Language selection on first step */}
        {currentStep === 0 && (
          <ScrollView
            style={styles.languageContainer}
            contentContainerStyle={styles.languageContent}
            showsVerticalScrollIndicator={false}
          >
            {(Object.keys(LANGUAGE_NAMES) as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageOption,
                  selectedLanguage === lang && styles.languageOptionSelected,
                ]}
                onPress={() => {
                  safeHaptics.selection();
                  setSelectedLanguage(lang);
                }}
              >
                <Text
                  style={[
                    styles.languageText,
                    selectedLanguage === lang && styles.languageTextSelected,
                  ]}
                >
                  {LANGUAGE_NAMES[lang]}
                </Text>
                {selectedLanguage === lang && (
                  <Check size={20} color={colors.text.inverse} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Action button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={currentStepData.action}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Please wait...' : currentStepData.buttonText}
            </Text>
            {!isLoading && currentStep < steps.length - 1 && (
              <ArrowRight size={20} color={colors.text.inverse} style={styles.buttonIcon} />
            )}
          </TouchableOpacity>

          {/* Skip option for permissions */}
          {(currentStep === 1 || currentStep === 2) && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={goToNextStep}
              disabled={isLoading}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.elevated,
  },
  progressDotActive: {
    backgroundColor: colors.accent.primary,
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: colors.status.success,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  featuresContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  featureText: {
    fontSize: 15,
    color: colors.text.primary,
    flex: 1,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  button: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borders.radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.glow,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: 17,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: spacing.xs,
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: 15,
  },
  // Language selection
  languageContainer: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  languageContent: {
    gap: spacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  languageOptionSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  languageText: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  languageTextSelected: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});
