import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Keyboard,
} from 'react-native';
import { ArrowRightLeft, ChevronDown, X, Search } from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows } from '../constants/theme';
import { safeHaptics, ImpactFeedbackStyle } from '../utils/haptics';
import { useLocationStore } from '../stores/useLocationStore';
import { detectCurrency } from '../utils/currency';

// Common currencies for travel
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '\u20A9', name: 'South Korean Won' },
  { code: 'CNY', symbol: '\u00A5', name: 'Chinese Yuan' },
  { code: 'THB', symbol: '\u0E3F', name: 'Thai Baht' },
  { code: 'VND', symbol: '\u20AB', name: 'Vietnamese Dong' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'PHP', symbol: '\u20B1', name: 'Philippine Peso' },
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
  { code: 'TRY', symbol: '\u20BA', name: 'Turkish Lira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
];

// Approximate exchange rates (relative to USD)
// In production, these would come from an API
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  KRW: 1320,
  CNY: 7.24,
  THB: 35.5,
  VND: 24500,
  SGD: 1.34,
  MYR: 4.72,
  IDR: 15700,
  PHP: 56.5,
  INR: 83.4,
  AUD: 1.54,
  NZD: 1.64,
  CAD: 1.36,
  CHF: 0.88,
  HKD: 7.82,
  TWD: 31.5,
  MXN: 17.2,
  BRL: 4.95,
  AED: 3.67,
  SAR: 3.75,
  TRY: 30.5,
  ZAR: 18.9,
};

interface CurrencyConverterProps {
  compact?: boolean;
  initialFromCurrency?: string;
  initialToCurrency?: string;
}

export default function CurrencyConverter({
  compact = false,
  initialFromCurrency,
  initialToCurrency,
}: CurrencyConverterProps) {
  const coordinates = useLocationStore((state) => state.coordinates);

  // Auto-detect local currency
  const localCurrency = useMemo(() => {
    if (coordinates) {
      return detectCurrency(coordinates);
    }
    return { code: 'USD', symbol: '$', name: 'US Dollar' };
  }, [coordinates]);

  // State
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState(initialFromCurrency || 'USD');
  const [toCurrency, setToCurrency] = useState(initialToCurrency || localCurrency.code);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get currency details
  const fromDetails = CURRENCIES.find((c) => c.code === fromCurrency) || CURRENCIES[0];
  const toDetails = CURRENCIES.find((c) => c.code === toCurrency) || CURRENCIES[3];

  // Calculate conversion
  const convertedAmount = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
    const toRate = EXCHANGE_RATES[toCurrency] || 1;

    // Convert to USD first, then to target currency
    const usdAmount = numAmount / fromRate;
    const result = usdAmount * toRate;

    // Format based on currency
    if (['JPY', 'KRW', 'VND', 'IDR'].includes(toCurrency)) {
      return Math.round(result).toLocaleString();
    }
    return result.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }, [amount, fromCurrency, toCurrency]);

  // Swap currencies
  const handleSwap = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  // Filter currencies for search
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) return CURRENCIES;
    const query = searchQuery.toLowerCase();
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Currency picker modal
  const renderCurrencyPicker = (
    isOpen: boolean,
    onClose: () => void,
    onSelect: (code: string) => void,
    title: string
  ) => (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={18} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search currencies..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>

          <ScrollView style={styles.currencyList}>
            {filteredCurrencies.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={styles.currencyItem}
                onPress={() => {
                  safeHaptics.impact(ImpactFeedbackStyle.Light);
                  onSelect(currency.code);
                  setSearchQuery('');
                  onClose();
                }}
              >
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={styles.currencyCode}>{currency.code}</Text>
                  <Text style={styles.currencyName}>{currency.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (compact) {
    // Compact inline version
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactRow}>
          <TouchableOpacity
            style={styles.compactCurrencyButton}
            onPress={() => setShowFromPicker(true)}
          >
            <Text style={styles.compactCurrencyText}>{fromCurrency}</Text>
            <ChevronDown size={14} color={colors.text.secondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.compactInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />

          <TouchableOpacity style={styles.compactSwapButton} onPress={handleSwap}>
            <ArrowRightLeft size={16} color={colors.accent.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.compactCurrencyButton}
            onPress={() => setShowToPicker(true)}
          >
            <Text style={styles.compactCurrencyText}>{toCurrency}</Text>
            <ChevronDown size={14} color={colors.text.secondary} />
          </TouchableOpacity>

          <Text style={styles.compactResult}>
            {toDetails.symbol}{convertedAmount}
          </Text>
        </View>

        {renderCurrencyPicker(showFromPicker, () => setShowFromPicker(false), setFromCurrency, 'From Currency')}
        {renderCurrencyPicker(showToPicker, () => setShowToPicker(false), setToCurrency, 'To Currency')}
      </View>
    );
  }

  // Full converter card
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Currency Converter</Text>

      {/* From section */}
      <View style={styles.currencySection}>
        <TouchableOpacity
          style={styles.currencySelector}
          onPress={() => setShowFromPicker(true)}
        >
          <Text style={styles.currencySelectorSymbol}>{fromDetails.symbol}</Text>
          <View style={styles.currencySelectorInfo}>
            <Text style={styles.currencySelectorCode}>{fromDetails.code}</Text>
            <Text style={styles.currencySelectorName}>{fromDetails.name}</Text>
          </View>
          <ChevronDown size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
          placeholderTextColor={colors.text.tertiary}
          onBlur={() => Keyboard.dismiss()}
        />
      </View>

      {/* Swap button */}
      <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
        <ArrowRightLeft size={20} color={colors.accent.primary} />
      </TouchableOpacity>

      {/* To section */}
      <View style={styles.currencySection}>
        <TouchableOpacity
          style={styles.currencySelector}
          onPress={() => setShowToPicker(true)}
        >
          <Text style={styles.currencySelectorSymbol}>{toDetails.symbol}</Text>
          <View style={styles.currencySelectorInfo}>
            <Text style={styles.currencySelectorCode}>{toDetails.code}</Text>
            <Text style={styles.currencySelectorName}>{toDetails.name}</Text>
          </View>
          <ChevronDown size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.resultContainer}>
          <Text style={styles.resultSymbol}>{toDetails.symbol}</Text>
          <Text style={styles.resultAmount}>{convertedAmount}</Text>
        </View>
      </View>

      {/* Exchange rate info */}
      <Text style={styles.rateInfo}>
        1 {fromDetails.code} = {(EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency]).toFixed(4)} {toDetails.code}
      </Text>
      <Text style={styles.rateDisclaimer}>
        Approximate rates for reference only
      </Text>

      {renderCurrencyPicker(showFromPicker, () => setShowFromPicker(false), setFromCurrency, 'From Currency')}
      {renderCurrencyPicker(showToPicker, () => setShowToPicker(false), setToCurrency, 'To Currency')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  currencySection: {
    gap: spacing.sm,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  currencySelectorSymbol: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    width: 32,
    textAlign: 'center',
  },
  currencySelectorInfo: {
    flex: 1,
  },
  currencySelectorCode: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  currencySelectorName: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  amountInput: {
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'right',
  },
  swapButton: {
    alignSelf: 'center',
    width: 40,
    height: 40,
    backgroundColor: colors.accent.muted,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: colors.accent.muted,
    borderRadius: borders.radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  resultSymbol: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.accent.primary,
  },
  resultAmount: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.accent.primary,
  },
  rateInfo: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  rateDisclaimer: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borders.radius.xl,
    borderTopRightRadius: borders.radius.xl,
    maxHeight: '70%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borders.radius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  currencyList: {
    paddingHorizontal: spacing.md,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borders.radius.md,
    gap: spacing.md,
  },
  currencySymbol: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    width: 40,
    textAlign: 'center',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  currencyName: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },

  // Compact styles
  compactContainer: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactCurrencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borders.radius.sm,
    gap: 2,
  },
  compactCurrencyText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  compactInput: {
    flex: 1,
    backgroundColor: colors.surface.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borders.radius.sm,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    textAlign: 'right',
    minWidth: 60,
  },
  compactSwapButton: {
    width: 28,
    height: 28,
    backgroundColor: colors.accent.muted,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactResult: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.accent.primary,
    minWidth: 70,
    textAlign: 'right',
  },
});
