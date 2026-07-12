import { StatusBar } from 'expo-status-bar';
import { useSQLiteContext } from 'expo-sqlite';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import {
  AppPreferences,
  DEFAULT_PREFERENCES,
  preferenceKeys,
} from '../constants/appPreferences';

export type AppTheme = {
  dark: boolean;
  colors: {
    background: string;
    card: string;
    cardMuted: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primarySoft: string;
    danger: string;
  };
};

type PreferencesContextValue = {
  preferences: AppPreferences;
  theme: AppTheme;
  ready: boolean;
  updatePreference: <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K],
  ) => Promise<void>;
  reloadPreferences: () => Promise<void>;
};

const lightTheme: AppTheme = {
  dark: false,
  colors: {
    background: '#F7F8FC',
    card: '#FFFFFF',
    cardMuted: '#EEF2F7',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    primary: '#2563EB',
    primarySoft: '#EFF6FF',
    danger: '#DC2626',
  },
};

const darkTheme: AppTheme = {
  dark: true,
  colors: {
    background: '#0B1220',
    card: '#111827',
    cardMuted: '#172033',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: '#273449',
    primary: '#60A5FA',
    primarySoft: '#172554',
    danger: '#F87171',
  },
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function resolveScheme(
  appearance: AppPreferences['appearance'],
  systemScheme: ColorSchemeName,
): 'light' | 'dark' {
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export default function PreferencesProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const systemScheme = useColorScheme();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  const reloadPreferences = useCallback(async () => {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key IN (?, ?, ?, ?)`,
      preferenceKeys.currency,
      preferenceKeys.weekStart,
      preferenceKeys.timeFormat,
      preferenceKeys.appearance,
    );

    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

    setPreferences({
      currency:
        (values[preferenceKeys.currency] as AppPreferences['currency']) ??
        DEFAULT_PREFERENCES.currency,
      weekStart:
        (values[preferenceKeys.weekStart] as AppPreferences['weekStart']) ??
        DEFAULT_PREFERENCES.weekStart,
      timeFormat:
        (values[preferenceKeys.timeFormat] as AppPreferences['timeFormat']) ??
        DEFAULT_PREFERENCES.timeFormat,
      appearance:
        (values[preferenceKeys.appearance] as AppPreferences['appearance']) ??
        DEFAULT_PREFERENCES.appearance,
    });
    setReady(true);
  }, [db]);

  useEffect(() => {
    reloadPreferences().catch(console.error);
  }, [reloadPreferences]);

  const updatePreference = useCallback(
    async <K extends keyof AppPreferences>(
      key: K,
      value: AppPreferences[K],
    ) => {
      const databaseKey = preferenceKeys[key];
      await db.runAsync(
        `INSERT INTO app_settings (key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        databaseKey,
        String(value),
      );
      setPreferences((current) => ({ ...current, [key]: value }));
    },
    [db],
  );

  const scheme = resolveScheme(preferences.appearance, systemScheme);
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      preferences,
      theme,
      ready,
      updatePreference,
      reloadPreferences,
    }),
    [preferences, theme, ready, updatePreference, reloadPreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return value;
}

export function formatCurrency(
  amount: number,
  currency: AppPreferences['currency'],
) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatTime(
  value: Date | string,
  timeFormat: AppPreferences['timeFormat'],
) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };

  if (timeFormat === '12h') options.hour12 = true;
  if (timeFormat === '24h') options.hour12 = false;

  return new Intl.DateTimeFormat(undefined, options).format(date);
}
