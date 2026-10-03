import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch } from 'react-native';
import { splitList } from '@ks1j/shared';

import { CommunityGate, useMyProfile } from '@/components/Community';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage, supabase } from '@/lib/supabase';

/** Your community profile: what other verified members see in the directory. Your name comes from your membership. */
export default function CommunityProfileScreen() {
  const { member } = useAuth();
  const { profile, loaded } = useMyProfile();
  const [form, setForm] = useState({ headline: '', profession: '', industry: '', city: 'Mumbai', skills: '', bio: '', mentorAreas: '', mentorNote: '' });
  const [listed, setListed] = useState(true);
  const [openToWork, setOpenToWork] = useState(false);
  const [mentor, setMentor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const muted = useThemeColor({}, 'mutedText');

  useEffect(() => {
    if (!profile) return;
    setForm({
      headline: profile.headline ?? '',
      profession: profile.profession ?? '',
      industry: profile.industry ?? '',
      city: profile.city ?? '',
      skills: profile.skills.join(', '),
      bio: profile.bio ?? '',
      mentorAreas: profile.mentor_areas.join(', '),
      mentorNote: profile.mentor_note ?? '',
    });
    setListed(profile.listed);
    setOpenToWork(profile.open_to_work);
    setMentor(profile.is_mentor);
  }, [profile]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const clean = (v: string) => v.trim() || null;

  async function save() {
    if (!member) return;
    setBusy(true);
    setError(null);
    const row = {
      member_id: member.id,
      headline: clean(form.headline),
      profession: clean(form.profession),
      industry: clean(form.industry),
      city: clean(form.city),
      skills: splitList(form.skills, 12),
      bio: clean(form.bio),
      listed,
      open_to_work: openToWork,
      is_mentor: mentor,
      mentor_areas: mentor ? splitList(form.mentorAreas, 8) : [],
      mentor_note: mentor ? clean(form.mentorNote) : null,
    };
    const { error } = await supabase.from('community_profiles').upsert(row);
    setBusy(false);
    if (error) setError(errorMessage(error));
    else router.back();
  }

  return (
    <Screen eyebrow="Community"
      title={profile ? 'My community profile' : 'Join the community'}
      intro="Only verified Jamaat members can see this. Your name comes from your membership, and your phone number is never shown.">
      <CommunityGate>
        {!loaded ? null : (
          <>
            <Text style={styles.name}>{member?.full_name}</Text>
            <Field label="One line about you" value={form.headline} onChangeText={set('headline')} maxLength={120} placeholder="e.g. Chartered accountant, 10 years in audit" />
            <Field label="Profession" value={form.profession} onChangeText={set('profession')} maxLength={60} placeholder="e.g. Finance, Medicine, Student" />
            <Field label="Industry" value={form.industry} onChangeText={set('industry')} maxLength={60} placeholder="e.g. Banking, Education" />
            <Field label="City" value={form.city} onChangeText={set('city')} maxLength={60} />
            <Field label="Skills" hint="Separate with commas. Up to 12." value={form.skills} onChangeText={set('skills')} placeholder="e.g. Tax, Excel, Gujarati" />
            <Field label="About you" value={form.bio} onChangeText={set('bio')} multiline maxLength={1000} />

            <SectionLabel>Choices</SectionLabel>
            <Toggle label="Show me in the directory" note="Turn off to stay hidden from search. Your posts still show your name." value={listed} onChange={setListed} />
            <Toggle label="Open to work" note="Shows an 'Open to work' label so members can refer you." value={openToWork} onChange={setOpenToWork} />
            <Toggle label="I want to be a mentor" note="Members can then ask you for a call. You choose whether to accept." value={mentor} onChange={setMentor} />
            {mentor ? (
              <>
                <Field label="I can help with" hint="Separate with commas." value={form.mentorAreas} onChangeText={set('mentorAreas')} placeholder="e.g. CA exams, First job" />
                <Field label="When you are free" value={form.mentorNote} onChangeText={set('mentorNote')} maxLength={300} placeholder="e.g. Sunday mornings" />
              </>
            ) : null}

            {error ? <Banner>{error}</Banner> : null}
            <Button title={profile ? 'Save' : 'Join'} onPress={save} busy={busy} />
            <Text style={[styles.small, { color: muted }]}>You can change or remove this at any time.</Text>
            {profile ? (
              <Button
                title="Leave the community"
                variant="secondary"
                onPress={async () => {
                  if (!member) return;
                  await supabase.from('community_profiles').delete().eq('member_id', member.id);
                  router.back();
                }}
              />
            ) : null}
          </>
        )}
      </CommunityGate>
    </Screen>
  );
}

function Toggle({ label, note, value, onChange }: { label: string; note: string; value: boolean; onChange: (v: boolean) => void }) {
  const muted = useThemeColor({}, 'mutedText');
  const tint = useThemeColor({}, 'tint');
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.toggle}>
      <View style={{ flex: 1 }} lightColor="transparent" darkColor="transparent">
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={[styles.small, { color: muted }]}>{note}</Text>
      </View>
      {/* The whole row is the button; the switch only shows the state (so one tap never toggles twice). */}
      <View pointerEvents="none" lightColor="transparent" darkColor="transparent">
        <Switch value={value} trackColor={{ true: tint }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 22, fontWeight: '700', marginBottom: 14 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  toggleLabel: { fontSize: 17, fontWeight: '600' },
  small: { fontSize: 15, lineHeight: 21, marginTop: 4 },
});
