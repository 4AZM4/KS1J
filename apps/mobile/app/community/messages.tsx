import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { timeAgo, type Tables } from '@ks1j/shared';

import { Card, CommunityGate, Empty, Filters, PersonLine, communityStyles, loadPeople, useMyProfile, type Person } from '@/components/Community';
import { Screen } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Conn = Tables<'community_connections'>;

/** Conversations open with consent: accepted ones under "Messages", new asks under "Requests". */
export default function MessagesScreen() {
  const { me } = useMyProfile();
  const [rows, setRows] = useState<Conn[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [tab, setTab] = useState<'messages' | 'requests'>('messages');
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(async () => {
    const { data } = await supabase.from('community_connections').select('*').order('created_at', { ascending: false });
    const list = data ?? [];
    setRows(list);
    setPeople(await loadPeople(list.flatMap((c) => [c.from_id, c.to_id])));
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const other = (c: Conn) => (c.from_id === me ? c.to_id : c.from_id);
  const name = (id: string) => people.get(id)?.display_name ?? 'Member';
  const accepted = rows.filter((c) => c.status === 'accepted');
  const incoming = rows.filter((c) => c.status === 'pending' && c.to_id === me);
  const outgoing = rows.filter((c) => c.status === 'pending' && c.from_id === me);

  async function answer(id: string, status: 'accepted' | 'declined') {
    await supabase.from('community_connections').update({ status }).eq('id', id);
    if (status === 'accepted') router.push({ pathname: '/community/chat', params: { id } });
    void load();
  }

  return (
    <Screen title="Messages" intro="Conversations open only when the other person accepts. Nobody else can read them.">
      <CommunityGate needProfile>
        <Filters
          options={[
            { value: 'messages', label: 'Messages' },
            { value: 'requests', label: incoming.length ? `Requests (${incoming.length})` : 'Requests' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'messages' ? (
          accepted.length === 0 ? (
            <Empty title="No conversations yet" text="Find someone in the Directory or the Mentorship circle and send a request." />
          ) : (
            accepted.map((c) => (
              <Card key={c.id}>
                <PersonLine
                  person={{ member_id: other(c), display_name: name(other(c)) }}
                  sub={c.kind === 'call' ? 'Call request accepted' : 'Message request accepted'}
                  onPress={() => router.push({ pathname: '/community/chat', params: { id: c.id } })}
                />
              </Card>
            ))
          )
        ) : (
          <>
            {incoming.length === 0 && outgoing.length === 0 ? <Empty title="No requests" /> : null}
            {incoming.map((c) => (
              <Card key={c.id} accent>
                <PersonLine person={{ member_id: c.from_id, display_name: name(c.from_id), headline: people.get(c.from_id)?.headline }} />
                <Text style={[communityStyles.meta, { color: muted }]}>
                  {c.kind === 'call' ? 'Asks for a call' : 'Asks to message you'} · {timeAgo(c.created_at)}
                  {c.preferred_time ? ` · prefers ${c.preferred_time}` : ''}
                </Text>
                <Text style={[communityStyles.body, { marginTop: 8 }]}>{c.note}</Text>
                <Button title="Accept" onPress={() => answer(c.id, 'accepted')} />
                <Button title="Decline" variant="secondary" onPress={() => answer(c.id, 'declined')} />
              </Card>
            ))}
            {outgoing.length ? (
              <View lightColor="transparent" darkColor="transparent">
                <Text style={[communityStyles.meta, { color: muted, marginVertical: 8 }]}>Waiting for an answer</Text>
                {outgoing.map((c) => (
                  <Card key={c.id}>
                    <PersonLine person={{ member_id: c.to_id, display_name: name(c.to_id) }} sub={`${c.kind === 'call' ? 'Call' : 'Message'} request sent ${timeAgo(c.created_at)}`} />
                  </Card>
                ))}
              </View>
            ) : null}
          </>
        )}
      </CommunityGate>
    </Screen>
  );
}
