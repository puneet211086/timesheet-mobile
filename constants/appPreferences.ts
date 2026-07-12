export type CurrencyCode = 'USD' | 'CAD' | 'GBP' | 'EUR' | 'INR' | 'AUD';
export type WeekStart = 'monday' | 'sunday';
export type TimeFormat = 'system' | '12h' | '24h';
export type AppearancePreference = 'system' | 'light' | 'dark';

export type AppPreferences = {
  currency: CurrencyCode;
  weekStart: WeekStart;
  timeFormat: TimeFormat;
  appearance: AppearancePreference;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  currency: 'USD',
  weekStart: 'monday',
  timeFormat: 'system',
  appearance: 'system',
};

export const CURRENCY_OPTIONS: Array<{
  code: CurrencyCode;
  symbol: string;
  label: string;
}> = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
];

export const preferenceKeys = {
  currency: 'currency_code',
  weekStart: 'week_start',
  timeFormat: 'time_format',
  appearance: 'appearance_mode',
} as const;
