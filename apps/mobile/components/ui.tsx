import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';

/** Large, high-contrast primary button. Body text never goes below 16. */
export function Button({
  title,
  onPress,
  disabled,
  busy,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const tint = useThemeColor({}, 'tint');
  const bg = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: tint } : { borderWidth: 1, borderColor: border },
        { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? bg : tint} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? bg : tint }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  return (
    <View style={styles.field} lightColor="transparent" darkColor="transparent">
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: muted }]}>{hint}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={muted}
        {...props}
        style={[styles.input, { color: text, borderColor: border }, props.multiline ? { minHeight: 96, textAlignVertical: 'top' } : null]}
      />
    </View>
  );
}

/** A row of large choice chips (one selected). */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; note?: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  return (
    <View style={styles.field} lightColor="transparent" darkColor="transparent">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices} lightColor="transparent" darkColor="transparent">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, selected }}
              aria-checked={selected}
              onPress={() => onChange(o.value)}
              style={[styles.chip, { borderColor: selected ? tint : border, borderWidth: selected ? 2 : 1 }]}>
              <Text style={[styles.chipText, selected ? { color: tint, fontWeight: '700' } : null]}>{o.label}</Text>
              {o.note ? <Text style={[styles.chipNote, { color: muted }]}>{o.note}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Banner({ children, tone = 'bad' }: { children: ReactNode; tone?: 'bad' | 'good' | 'info' }) {
  const colors = { bad: '#B42318', good: '#0F6B4F', info: '#555555' }[tone];
  return (
    <View style={[styles.banner, { borderColor: colors }]} lightColor="transparent" darkColor="transparent">
      <Text style={{ color: colors, fontSize: 16, lineHeight: 22 }}>{children}</Text>
    </View>
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label?: string }) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View
      style={[styles.track, { backgroundColor: border }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? `${pct}% complete`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={[styles.bar, { width: `${pct}%`, backgroundColor: tint }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 8 },
  buttonText: { fontSize: 17, fontWeight: '700' },
  field: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  hint: { fontSize: 14, marginBottom: 6, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 10, fontSize: 18, paddingHorizontal: 12, paddingVertical: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 48, justifyContent: 'center' },
  chipText: { fontSize: 16 },
  chipNote: { fontSize: 13, marginTop: 2 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 10 },
  bar: { height: 10, borderRadius: 5 },
});
