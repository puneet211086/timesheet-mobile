import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../constants/theme';
import { combineLocalDateAndTime, localDateInputValue, localTimeInputValue } from '../utils/entry';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: string;
  dateContext?: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export default function NativeDateTimeField({ label, mode, value, dateContext, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => {
    if (mode === 'date') {
      return combineLocalDateAndTime(value, '12:00') ?? new Date();
    }
    return combineLocalDateAndTime(dateContext ?? localDateInputValue(new Date().toISOString()), value) ?? new Date();
  }, [dateContext, mode, value]);

  const display = useMemo(() => {
    if (mode === 'date') {
      return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }, [mode, parsed]);

  const handleChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !next) return;
    onChange(mode === 'date' ? localDateInputValue(next.toISOString()) : localTimeInputValue(next.toISOString()));
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          keyboardType={mode === 'time' ? 'numbers-and-punctuation' : 'default'}
          style={styles.input}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setOpen((current) => !current)} accessibilityRole="button">
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={19} color={colors.primary} />
        <Text style={styles.value}>{display}</Text>
        <Ionicons name={open && Platform.OS === 'ios' ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textSoft} />
      </Pressable>
      {open ? (
        <View style={styles.pickerBox}>
          <DateTimePicker
            value={parsed}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            themeVariant="light"
          />
          {Platform.OS === 'ios' ? (
            <Pressable style={styles.doneButton} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  label: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontSize: 16 },
  field: { minHeight: 50, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  value: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  pickerBox: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  doneButton: { alignSelf: 'flex-end', paddingHorizontal: 18, paddingVertical: 12 },
  doneText: { color: colors.primary, fontWeight: '900', fontSize: 15 },
});
