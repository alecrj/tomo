import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Mic, ArrowRight, Globe, Compass, MessageSquare } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { colors, spacing } from '../constants/theme';
import { useOnboardingStore } from '../stores/useOnboardingStore';

const { width } = Dimensions.get('window');

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
  const fadeAnim = useState(new Animated.Value(1))[0];

  const {
    completeOnboarding,
    setLocationPermission,
    setMicrophonePermission,
  } = useOnboardingStore();

  const requestLocation = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Location permission error:', error);
    }
    setIsLoading(false);
    goToNextStep();
  };

  const requestMicrophone = async () => {
    setIsLoading(true);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setMicrophonePermission(status === 'granted');
    } catch (error) {
      console.error('Microphone permission error:', error);
    }
    setIsLoading(false);
    goToNextStep();
  };

  const finishOnboarding = async () => {
    completeOnboarding();
    router.replace('/');
  };

  const goToNextStep = () => {
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
      icon: <Globe size={64} color="#007AFF" />,
      title: 'Welcome to Tomo',
      description:
        "Your AI travel companion that knows where you are, shows maps, navigates you anywhere, and remembers everything about your trip.",
      buttonText: 'Get Started',
      action: async () => goToNextStep(),
    },
    {
      icon: <MapPin size={64} color="#34C759" />,
      title: 'Location Access',
      description:
        "Tomo needs to know where you are to give you relevant recommendations. We'll never share your location data.",
      buttonText: 'Enable Location',
      action: requestLocation,
    },
    {
      icon: <Mic size={64} color="#FF9500" />,
      title: 'Voice Input',
      description:
        'Talk to Tomo naturally! Voice input makes it easy to ask questions while exploring.',
      buttonText: 'Enable Microphone',
      action: requestMicrophone,
    },
    {
      icon: <MessageSquare size={64} color="#007AFF" />,
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

        {/* Features preview on welcome step */}
        {currentStep === 0 && (
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <MapPin size={20} color="#34C759" />
              <Text style={styles.featureText}>Always knows your location</Text>
            </View>
            <View style={styles.featureRow}>
              <Compass size={20} color="#007AFF" />
              <Text style={styles.featureText}>Navigate anywhere with maps</Text>
            </View>
            <View style={styles.featureRow}>
              <MessageSquare size={20} color="#FF9500" />
              <Text style={styles.featureText}>Remembers your preferences</Text>
            </View>
          </View>
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
              <ArrowRight size={20} color="#FFFFFF" style={styles.buttonIcon} />
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E5E5EA',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#34C759',
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
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.light.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.light.secondary,
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
    backgroundColor: '#F9F9F9',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 15,
    color: colors.text.light.primary,
    flex: 1,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
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
    color: colors.text.light.secondary,
    fontSize: 15,
  },
});
