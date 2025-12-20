import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { useBudgetStore } from '../stores/useBudgetStore';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍜' },
  { id: 'transport', label: 'Transport', emoji: '🚇' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'activity', label: 'Activity', emoji: '🎭' },
  { id: 'other', label: 'Other', emoji: '💰' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

export function AddExpenseModal({ visible, onClose }: AddExpenseModalProps) {
  const addExpense = useBudgetStore((state) => state.addExpense);

  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food');
  const [note, setNote] = useState('');

  const handleSave = () => {
    // Validate amount
    const amountNum = parseInt(amount, 10);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    // Add expense
    addExpense({
      id: `expense_${Date.now()}`,
      amount: amountNum,
      category: selectedCategory,
      note: note.trim() || undefined,
      timestamp: Date.now(),
    });

    // Reset form
    setAmount('');
    setSelectedCategory('food');
    setNote('');

    // Close modal
    onClose();
  };

  const handleClose = () => {
    // Reset form
    setAmount('');
    setSelectedCategory('food');
    setNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add Expense</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <X size={24} color={colors.text.light.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Amount Input */}
              <View style={styles.section}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>¥</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor={colors.text.light.tertiary}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="number-pad"
                    autoFocus
                  />
                </View>
              </View>

              {/* Category Selection */}
              <View style={styles.section}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        selectedCategory === category.id && styles.categoryButtonSelected,
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                      <Text
                        style={[
                          styles.categoryLabel,
                          selectedCategory === category.id && styles.categoryLabelSelected,
                        ]}
                      >
                        {category.label}
                      </Text>
                      {selectedCategory === category.id && (
                        <View style={styles.selectedIndicator}>
                          <Check size={16} color={colors.surface.card} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Note Input */}
              <View style={styles.section}>
                <Text style={styles.label}>Note (optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="e.g., Lunch at Tsukiji"
                  placeholderTextColor={colors.text.light.tertiary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={100}
                />
              </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.saveButton, !amount && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!amount}
              >
                <Text style={styles.saveButtonText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    maxHeight: '85%',
  },
  modal: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    maxHeight: 450,
  },
  contentContainer: {
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginBottom: spacing.lg,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  currencySymbol: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    paddingVertical: spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface.input,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonSelected: {
    backgroundColor: colors.interactive.primary,
    borderColor: colors.interactive.primary,
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
  },
  categoryLabelSelected: {
    color: colors.surface.card,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    backgroundColor: colors.status.success,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: {
    backgroundColor: colors.surface.input,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.light.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  saveButton: {
    backgroundColor: colors.interactive.primary,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.surface.card,
  },
});
