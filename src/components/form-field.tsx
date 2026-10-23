import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  hint?: string;
  optional?: boolean;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  optional = false,
}: FormFieldProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional ? <Text style={styles.optional}>Optional</Text> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Palette.textMuted}
        keyboardType="decimal-pad"
        inputMode="decimal"
        accessibilityLabel={label}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: Palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  optional: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceRaised,
    color: Palette.text,
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  inputError: {
    borderColor: Palette.danger,
  },
  error: {
    color: Palette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
