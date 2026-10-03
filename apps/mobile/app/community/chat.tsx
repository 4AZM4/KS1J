import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { timeAgo, type Tables } from '@ks1j/shared';

import { ART } from '@/components/Art';
import { CommunityGate, PersonLine, communityStyles, loadPeople, useMyProfile, type Person } from '@/components/Community';
import { Screen } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Field } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';

/** One private conversation. Only the two people in it can read it; it refreshes every few seconds. */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useMyProfile();
  const [conn, setConn] = useState<Tables<'community_connections'> | null>(null);
  const [msgs, setMsgs] = useState<Tables<'community_messages'>[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('community_connections').select('*').eq('id', id).maybeSingle(),
      supabase.from('community_messages').select('*').eq('connection_id', id).order('created_at'),
    ]);
    setConn(c);
    setMsgs(m ?? []);
    if (c) setPeople(await loadPeople([c.from_id, c.to_id]));
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  async function send() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('community_messages').insert({ connection_id: id, body: text.trim() });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setText('');
    void load();
  }

  if (!conn) return <Screen title="Conversation"><CommunityGate>{null}</CommunityGate></Screen>;
  const otherId = conn.from_id === me ? conn.to_id : conn.from_id;
  const other = people.get(otherId);

  return (
    <Screen title={other?.display_name ?? 'Conversation'}>
      <CommunityGate needProfile>
        <PersonLine person={{ member_id: otherId, display_name: other?.display_name ?? 'Member', headline: other?.headline }} />
        <View style={[styles.note, { backgroundColor: card }]} lightColor="transparent" darkColor="transparent">
          <Text style={[communityStyles.meta, { color: muted, marginTop: 0 }]}>
            {conn.kind === 'call' ? 'Call request' : 'Message request'}
            {conn.preferred_time ? ` · prefers ${conn.preferred_time}` : ''}
          </Text>
          <Text style={communityStyles.body}>{conn.note}</Text>
        </View>
        {conn.status !== 'accepted' ? (
          <Banner tone="info">{conn.status === 'pending' ? 'Waiting for an answer. You can talk once the request is accepted.' : 'This request was declined.'}</Banner>
        ) : (
          <>
            {msgs.map((m) => {
              const mine = m.sender_id === me;
              return (
                <View
                  key={m.id}
                  style={[styles.bubble, mine ? styles.mine : [styles.theirs, { backgroundColor: card }]]}
                  lightColor={mine ? ART.deep : undefined}
                  darkColor={mine ? ART.deep : undefined}>
                  <Text style={[communityStyles.body, mine ? { color: '#FFFFFF' } : null]}>{m.body}</Text>
                  <Text style={[styles.time, { color: mine ? ART.mint : muted }]}>{timeAgo(m.created_at)}</Text>
                </View>
              );
            })}
            <Field label="Your message" value={text} onChangeText={setText} multiline maxLength={2000} />
            {error ? <Banner>{error}</Banner> : null}
            <Button title="Send" onPress={send} busy={busy} disabled={text.trim().length === 0} />
            <Text style={[communityStyles.meta, { color: muted }]}>
              Arrange calls here; keep phone numbers private until you are both comfortable.
            </Text>
          </>
        )}
      </CommunityGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { borderRadius: 14, padding: 14, marginVertical: 12 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, maxWidth: '85%' },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  time: { fontSize: 13, marginTop: 4 },
});
