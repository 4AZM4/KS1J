import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { Tables } from '@ks1j/shared';

import { Avatar, Card, CommunityGate, JoinPrompt, ReportLink, Tags, communityStyles, useMyProfile } from '@/components/Community';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Field } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';

type Kind = 'message' | 'call';

/** One member's community profile, with "Send a message request" and, for mentors, "Request a call". */
export default function PersonScreen() {
  const { id, ask } = useLocalSearchParams<{ id: string; ask?: string }>();
  const { profile: mine, me } = useMyProfile();
  const [p, setP] = useState<Tables<'community_profiles'> | null>(null);
  const [existing, setExisting] = useState<Tables<'community_connections'>[]>([]);
  const [kind, setKind] = useState<Kind | null>(ask === 'call' ? 'call' : null);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(async () => {
    const { data } = await supabase.from('community_profiles').select('*').eq('member_id', id).maybeSingle();
    setP(data);
    if (me) {
      const { data: c } = await supabase
        .from('community_connections')
        .select('*')
        .or(`and(from_id.eq.${me},to_id.eq.${id}),and(from_id.eq.${id},to_id.eq.${me})`);
      setExisting(c ?? []);
    }
  }, [id, me]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const open = existing.find((c) => c.status === 'accepted');
  const pending = existing.find((c) => c.status === 'pending' && c.from_id === me);

  async function send() {
    if (!kind) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from('community_connections')
      .insert({ to_id: id, kind, note: note.trim(), preferred_time: kind === 'call' ? when.trim() || null : null });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setSent(true);
    void load();
  }

  return (
    <Screen title={p?.display_name ?? 'Member'}>
      <CommunityGate>
        {!p ? null : (
          <>
            <View style={styles.head} lightColor="transparent" darkColor="transparent">
              <Avatar name={p.display_name} size={72} />
              <View style={{ flex: 1 }} lightColor="transparent" darkColor="transparent">
                {p.headline ? <Text style={styles.headline}>{p.headline}</Text> : null}
                <Text style={[communityStyles.meta, { color: muted }]}>{[p.profession, p.industry, p.city].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>
            <Tags items={[...(p.open_to_work ? ['Open to work'] : []), ...(p.is_mentor ? ['Mentor'] : [])]} tone="gold" />
            {p.bio ? <Text style={[communityStyles.body, { marginTop: 14 }]}>{p.bio}</Text> : null}
            {p.skills.length ? (
              <>
                <SectionLabel>Skills</SectionLabel>
                <Tags items={p.skills} />
              </>
            ) : null}
            {p.is_mentor ? (
              <>
                <SectionLabel>Mentoring</SectionLabel>
                <Tags items={p.mentor_areas} />
                {p.mentor_note ? <Text style={[communityStyles.meta, { color: muted }]}>Usually free: {p.mentor_note}</Text> : null}
              </>
            ) : null}

            <View style={{ marginTop: 20 }} lightColor="transparent" darkColor="transparent">
              {p.member_id === me ? (
                <Button title="Edit my profile" variant="secondary" onPress={() => router.push('/community/profile')} />
              ) : !mine ? (
                <JoinPrompt text="Make a short profile to send a message request. The other person sees who is asking." />
              ) : open ? (
                <Button title="Open conversation" onPress={() => router.push({ pathname: '/community/chat', params: { id: open.id } })} />
              ) : pending || sent ? (
                <Banner tone="good">Request sent. You can talk once {p.display_name} accepts.</Banner>
              ) : kind ? (
                <Card>
                  <Text style={communityStyles.cardTitle}>{kind === 'call' ? 'Request a call' : 'Send a message request'}</Text>
                  <Text style={[communityStyles.meta, { color: muted, marginBottom: 10 }]}>
                    Conversations open with consent: {p.display_name} sees your note and chooses whether to accept.
                  </Text>
                  <Field label="Your note" value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Salaam, I would like to ask about…" />
                  {kind === 'call' ? <Field label="When suits you" value={when} onChangeText={setWhen} maxLength={80} placeholder="e.g. Sunday morning" /> : null}
                  {error ? <Banner>{error}</Banner> : null}
                  <Button title="Send request" onPress={send} busy={busy} disabled={note.trim().length === 0} />
                  <Button title="Cancel" variant="secondary" onPress={() => setKind(null)} />
                </Card>
              ) : (
                <>
                  {p.is_mentor ? <Button title="Request a call" onPress={() => setKind('call')} /> : null}
                  <Button title="Send a message request" variant={p.is_mentor ? 'secondary' : 'primary'} onPress={() => setKind('message')} />
                </>
              )}
            </View>
            {p.member_id !== me ? <ReportLink kind="profile" id={p.member_id} /> : null}
          </>
        )}
      </CommunityGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 6 },
  headline: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
});
