import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { initials, type Tables } from '@ks1j/shared';

import { ART } from '@/components/Art';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button } from '@/components/ui';
import { DISPLAY, cardShadow } from '@/constants/Type';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type Person = Pick<
  Tables<'community_profiles'>,
  'member_id' | 'display_name' | 'headline' | 'profession' | 'industry' | 'city' | 'skills' | 'is_mentor' | 'mentor_areas' | 'open_to_work'
>;
const PERSON_COLS = 'member_id, display_name, headline, profession, industry, city, skills, is_mentor, mentor_areas, open_to_work';

/** Names and headlines for a set of members, in one query (only community profiles, never phone or address). */
export async function loadPeople(ids: string[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, Person>();
  if (unique.length === 0) return map;
  const { data } = await supabase.from('community_profiles').select(PERSON_COLS).in('member_id', unique);
  for (const p of (data ?? []) as Person[]) map.set(p.member_id, p);
  return map;
}

/** The signed-in member's own community profile (null until they create one). Reloads when the screen is shown. */
export function useMyProfile() {
  const { member } = useAuth();
  const [profile, setProfile] = useState<Tables<'community_profiles'> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    if (!member) return;
    const { data } = await supabase.from('community_profiles').select('*').eq('member_id', member.id).maybeSingle();
    setProfile(data);
    setLoaded(true);
  }, [member]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  return { profile, loaded, reload, verified: !!member?.membership_verified, me: member?.id ?? null };
}

/**
 * Shown instead of a community screen to members the Jamaat has not verified yet, and (when `needProfile`)
 * to members who have not made a community profile: only verified members take part, and you appear to
 * others only once you choose to.
 */
export function CommunityGate({ needProfile, children }: { needProfile?: boolean; children: ReactNode }) {
  const { member } = useAuth();
  const { profile, loaded } = useMyProfile();
  if (!member) return null;
  if (!member.membership_verified) {
    return (
      <Banner tone="info">
        Community opens once the Jamaat has verified your membership. Until then, everything else in the app works as usual.
      </Banner>
    );
  }
  if (needProfile && loaded && !profile) return <JoinPrompt />;
  return <>{children}</>;
}

export function JoinPrompt({ text }: { text?: string }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>Join the community</Text>
      <Text style={styles.body}>
        {text ??
          'Make a short profile so other members can find you. Only verified Jamaat members can see it, and your phone number is never shown.'}
      </Text>
      <Button title="Make my profile" onPress={() => router.push('/community/profile')} />
    </Card>
  );
}

export function Card({ children, accent }: { children: ReactNode; accent?: boolean }) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  return (
    <View
      style={[styles.card, { backgroundColor: card, borderColor: border }, cardShadow, accent ? { borderLeftWidth: 4, borderLeftColor: ART.gold } : null]}
      lightColor="transparent"
      darkColor="transparent">
      {children}
    </View>
  );
}

export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  return (
    <View
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      lightColor={ART.deep}
      darkColor={ART.deep}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Text style={{ color: ART.goldLight, fontSize: size * 0.36, fontWeight: '700' }}>{initials(name)}</Text>
    </View>
  );
}

/** Small rounded labels (skills, kinds, "Open to work"). */
export function Tags({ items, tone = 'plain' }: { items: string[]; tone?: 'plain' | 'gold' }) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  if (items.length === 0) return null;
  return (
    <View style={styles.tags} lightColor="transparent" darkColor="transparent">
      {items.map((t) => (
        <View
          key={t}
          style={[styles.tag, tone === 'gold' ? { borderColor: ART.gold, backgroundColor: 'rgba(201,162,74,0.14)' } : { borderColor: border }]}
          lightColor="transparent"
          darkColor="transparent">
          <Text style={[styles.tagText, { color: tone === 'gold' ? undefined : muted }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** A name with avatar and one line under it. Tapping opens the person's profile. */
export function PersonLine({ person, sub, onPress }: { person: { member_id: string; display_name: string; headline?: string | null }; sub?: string; onPress?: () => void }) {
  const muted = useThemeColor({}, 'mutedText');
  const open = onPress ?? (() => router.push({ pathname: '/community/person', params: { id: person.member_id } }));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${person.display_name}, open profile`} onPress={open} style={styles.personLine}>
      <Avatar name={person.display_name} size={44} />
      <View style={{ flex: 1 }} lightColor="transparent" darkColor="transparent">
        <Text style={styles.name}>{person.display_name}</Text>
        {sub || person.headline ? <Text style={[styles.sub, { color: muted }]}>{sub ?? person.headline}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Single-select filter chips without a label (the screen title already says what they filter). */
export function Filters<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'card');
  return (
    <View style={styles.filters} lightColor="transparent" darkColor="transparent">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, selected: on }}
            aria-checked={on}
            onPress={() => onChange(o.value)}
            style={[styles.filter, on ? { backgroundColor: tint, borderColor: tint } : { borderColor: border, backgroundColor: surface }]}>
            <Text style={[styles.filterText, on ? { color: surface, fontWeight: '700' } : null]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A plain text link-style button (secondary actions such as Report). */
export function TextButton({ title, onPress, tone = 'tint' }: { title: string; onPress: () => void; tone?: 'tint' | 'muted' }) {
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'mutedText');
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textButton} hitSlop={8}>
      <Text style={{ color: tone === 'tint' ? tint : muted, fontSize: 16, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

const REASONS = ['Not appropriate', 'Spam or selling', 'Wrong information'];

/** "Report" opens three plain reasons; the committee reviews every report. The app never removes anything itself. */
export function ReportLink({ kind, id }: { kind: 'post' | 'opportunity' | 'profile' | 'group'; id: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const muted = useThemeColor({}, 'mutedText');
  if (done) return <Text style={[styles.sub, { color: muted }]}>Thank you. The committee will look at it.</Text>;
  if (!open) return <TextButton title="Report" tone="muted" onPress={() => setOpen(true)} />;
  return (
    <View style={styles.reasons} lightColor="transparent" darkColor="transparent">
      <Text style={[styles.sub, { color: muted }]}>Why are you reporting this?</Text>
      {REASONS.map((r) => (
        <TextButton
          key={r}
          title={r}
          onPress={async () => {
            const { error } = await supabase.from('community_reports').insert({ target_kind: kind, target_id: id, reason: r });
            if (!error) setDone(true);
          }}
        />
      ))}
      <TextButton title="Cancel" tone="muted" onPress={() => setOpen(false)} />
    </View>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  const muted = useThemeColor({}, 'mutedText');
  return (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      {text ? <Text style={[styles.body, { color: muted }]}>{text}</Text> : null}
    </Card>
  );
}

export const communityStyles = StyleSheet.create({
  cardTitle: { fontFamily: DISPLAY, fontSize: 21, lineHeight: 28, marginBottom: 6 },
  body: { fontSize: 17, lineHeight: 25 },
  meta: { fontSize: 15, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' },
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 12 },
  cardTitle: communityStyles.cardTitle,
  body: { fontSize: 16, lineHeight: 23, marginBottom: 4 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 14 },
  personLine: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  name: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 15, lineHeight: 21, marginTop: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  filterText: { fontSize: 16 },
  textButton: { paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  reasons: { marginTop: 6 },
});
