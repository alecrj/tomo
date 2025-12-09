/**
 * Setup validation utilities
 * Checks if app is configured correctly before use
 */

import { config } from '../constants/config';

export interface SetupIssue {
  type: 'error' | 'warning';
  title: string;
  message: string;
  fix?: string;
}

/**
 * Check if all required API keys are configured
 */
export function checkApiKeys(): SetupIssue[] {
  const issues: SetupIssue[] = [];

  if (!config.claudeApiKey) {
    issues.push({
      type: 'error',
      title: 'Claude API Key Missing',
      message: 'AI destination generation will not work without a Claude API key.',
      fix: 'Add EXPO_PUBLIC_CLAUDE_API_KEY to your .env file',
    });
  }

  if (!config.googlePlacesApiKey) {
    issues.push({
      type: 'error',
      title: 'Google Places API Key Missing',
      message: 'Maps, navigation, and place details will not work.',
      fix: 'Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to your .env file',
    });
  }

  if (!config.weatherApiKey) {
    issues.push({
      type: 'warning',
      title: 'Weather API Key Missing',
      message: 'Weather data will use mock values instead of real data.',
      fix: 'Add EXPO_PUBLIC_WEATHER_API_KEY to your .env file (optional)',
    });
  }

  return issues;
}

/**
 * Check if app is ready for use
 */
export function checkAppSetup(): {
  ready: boolean;
  issues: SetupIssue[];
} {
  const issues = checkApiKeys();
  const errors = issues.filter((issue) => issue.type === 'error');

  return {
    ready: errors.length === 0,
    issues,
  };
}

/**
 * Get user-friendly error message for API errors
 */
export function getApiErrorMessage(error: any, apiName: string): string {
  if (error.message?.includes('401') || error.message?.includes('403')) {
    return `${apiName} authentication failed. Check your API key.`;
  }

  if (error.message?.includes('429')) {
    return `${apiName} rate limit exceeded. Please try again later.`;
  }

  if (error.message?.includes('Network')) {
    return 'No internet connection. Please check your network.';
  }

  return `${apiName} error: ${error.message || 'Unknown error'}`;
}
