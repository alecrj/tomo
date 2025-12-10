import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import { useTripStore } from '../stores/useTripStore';
import { useLocationStore } from '../stores/useLocationStore';
import { colors, spacing } from '../constants/theme';
import { detectCurrency } from '../utils/currency';
import type { Visit } from '../types';

interface LogVisitModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LogVisitModal({ visible, onClose }: LogVisitModalProps) {
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const addVisit = useTripStore((state) => state.addVisit);
  const startTrip = useTripStore((state) => state.startTrip);
  const currentTrip = useTripStore((state) => state.currentTrip);

  const [placeName, setPlaceName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [expense, setExpense] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-populate city and country from neighborhood
  useEffect(() => {
    if (visible && neighborhood) {
      // Try to parse city and country from neighborhood string
      // Format is usually: "District, City, Region" or "City, Country"
      const parts = neighborhood.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        setCity(parts[parts.length - 2] || '');
        setCountry(parts[parts.length - 1] || '');
      } else if (parts.length === 1) {
        setCity(parts[0] || '');
      }
    }
  }, [visible, neighborhood]);

  const handleSave = async () => {
    if (!placeName.trim() || !city.trim() || !country.trim() || !coordinates) {
      return;
    }

    setIsSaving(true);

    try {
      // Start trip if not started
      if (!currentTrip) {
        startTrip();
      }

      // Create visit
      const visit: Omit<Visit, 'timestamp'> = {
        placeId: `place-${Date.now()}`,
        name: placeName.trim(),
        neighborhood: neighborhood || city,
        city: city.trim(),
        country: country.trim(),
        coordinates,
        expense: expense ? parseFloat(expense) : undefined,
      };

      addVisit(visit);

      // Reset form
      setPlaceName('');
      setExpense('');
      setIsSaving(false);
      onClose();
    } catch (error) {
      console.error('Error logging visit:', error);
      setIsSaving(false);
    }
  };

  const currency = coordinates ? detectCurrency(coordinates) : { symbol: '$' };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Log Visit</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text.light.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Location */}
          <View style={styles.locationCard}>
            <MapPin size={20} color="#007AFF" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Current Location</Text>
              <Text style={styles.locationText}>
                {neighborhood || 'Location detected'}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Place Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Chatuchak Market"
                value={placeName}
                onChangeText={setPlaceName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>
                  City <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Bangkok"
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>
                  Country <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Thailand"
                  value={country}
                  onChangeText={setCountry}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Expense (optional)</Text>
              <View style={styles.expenseInput}>
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                <TextInput
                  style={styles.expenseInputField}
                  placeholder="0"
                  value={expense}
                  onChangeText={setExpense}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.hint}>
              This will be added to your trip log and shown in your trip recap.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!placeName.trim() || !city.trim() || !country.trim()) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={
              !placeName.trim() || !city.trim() || !country.trim() || isSaving
            }
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Log Visit</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.light.primary,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
    top: 60,
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    gap: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: colors.text.light.primary,
  },
  form: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.light.primary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.status.error,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text.light.primary,
  },
  expenseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingLeft: spacing.lg,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.light.secondary,
    marginRight: spacing.xs,
  },
  expenseInputField: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
    fontSize: 16,
    color: colors.text.light.primary,
  },
  hint: {
    fontSize: 13,
    color: colors.text.light.secondary,
    lineHeight: 18,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
