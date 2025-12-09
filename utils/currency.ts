import { Coordinates } from '../types';

/**
 * Currency information
 */
export interface CurrencyInfo {
  code: string; // ISO 4217 currency code
  symbol: string; // Currency symbol
  name: string; // Full currency name
}

/**
 * Detect currency based on GPS coordinates
 * Uses rough bounding boxes for major travel destinations
 */
export function detectCurrency(coordinates: Coordinates): CurrencyInfo {
  const { latitude, longitude } = coordinates;

  // Thailand (Baht)
  if (
    latitude >= 5.5 && latitude <= 20.5 &&
    longitude >= 97.0 && longitude <= 106.0
  ) {
    return { code: 'THB', symbol: '฿', name: 'Thai Baht' };
  }

  // Japan (Yen)
  if (
    latitude >= 24.0 && latitude <= 46.0 &&
    longitude >= 123.0 && longitude <= 146.0
  ) {
    return { code: 'JPY', symbol: '¥', name: 'Japanese Yen' };
  }

  // Vietnam (Dong)
  if (
    latitude >= 8.0 && latitude <= 24.0 &&
    longitude >= 102.0 && longitude <= 110.0
  ) {
    return { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' };
  }

  // Singapore (Dollar)
  if (
    latitude >= 1.1 && latitude <= 1.5 &&
    longitude >= 103.6 && longitude <= 104.1
  ) {
    return { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' };
  }

  // Malaysia (Ringgit)
  if (
    latitude >= 1.0 && latitude <= 7.5 &&
    longitude >= 99.5 && longitude <= 119.5
  ) {
    return { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' };
  }

  // Indonesia (Rupiah)
  if (
    latitude >= -11.0 && latitude <= 6.0 &&
    longitude >= 95.0 && longitude <= 141.0
  ) {
    return { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' };
  }

  // Philippines (Peso)
  if (
    latitude >= 4.5 && latitude <= 21.0 &&
    longitude >= 116.0 && longitude <= 127.0
  ) {
    return { code: 'PHP', symbol: '₱', name: 'Philippine Peso' };
  }

  // South Korea (Won)
  if (
    latitude >= 33.0 && latitude <= 39.0 &&
    longitude >= 124.0 && longitude <= 132.0
  ) {
    return { code: 'KRW', symbol: '₩', name: 'South Korean Won' };
  }

  // Taiwan (Dollar)
  if (
    latitude >= 21.5 && latitude <= 25.5 &&
    longitude >= 119.5 && longitude <= 122.5
  ) {
    return { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' };
  }

  // Hong Kong (Dollar)
  if (
    latitude >= 22.1 && latitude <= 22.6 &&
    longitude >= 113.8 && longitude <= 114.5
  ) {
    return { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' };
  }

  // United Kingdom (Pound)
  if (
    latitude >= 49.5 && latitude <= 61.0 &&
    longitude >= -8.0 && longitude <= 2.0
  ) {
    return { code: 'GBP', symbol: '£', name: 'British Pound' };
  }

  // Eurozone (approximate - covers most of Western Europe)
  if (
    latitude >= 35.0 && latitude <= 71.0 &&
    longitude >= -10.0 && longitude <= 30.0
  ) {
    return { code: 'EUR', symbol: '€', name: 'Euro' };
  }

  // Australia (Dollar)
  if (
    latitude >= -44.0 && latitude <= -10.0 &&
    longitude >= 112.0 && longitude <= 154.0
  ) {
    return { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' };
  }

  // New Zealand (Dollar)
  if (
    latitude >= -47.0 && latitude <= -34.0 &&
    longitude >= 166.0 && longitude <= 179.0
  ) {
    return { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' };
  }

  // Default: USD (covers USA, Canada roughly, and fallback)
  return { code: 'USD', symbol: '$', name: 'US Dollar' };
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currency: CurrencyInfo): string {
  // For currencies without decimal (JPY, KRW, VND, IDR)
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR'];

  if (noDecimalCurrencies.includes(currency.code)) {
    return `${currency.symbol}${Math.round(amount).toLocaleString()}`;
  }

  return `${currency.symbol}${amount.toFixed(2).toLocaleString()}`;
}
