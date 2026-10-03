import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { OPPORTUNITY_KINDS, OPPORTUNITY_KIND_LABEL, timeAgo, type OpportunityKind, type Tables } from '@ks1j/shared';

import { Card, CommunityGate, Empty, Filters, JoinPrompt, PersonLine, ReportLink, Tags, TextButton, communityStyles, loadPeople, useMyProfile, type Person } from '@/components/Community';
import { Screen } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Choice, Field } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';

type Opp = Tables<'community_opportunities'>;

/** Jobs, referrals, business ideas and mentorship openings, shared within a network members can trust. */
export default function OpportunitiesScreen() {
  const { profile, me } = useMyProfile();
  const [rows, setRows] = useState<Opp[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [filter, setFilter] = useState<'all' | OpportunityKind>('all');
  const [writing, setWriting] = useState(false);
  const [kind, setKind] = useState<OpportunityKind | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(async () => {
    const { data } = await supabase.from('community_opportunities').select('*').neq('status', 'removed').order('created_at', { ascending: false }).limit(100);
    const list = data ?? [];
    setRows(list);
    setPeople(await loadPeople(list.map((o) => o.author_id)));
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function post() {
    if (!kind) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('community_opportunities').insert({ kind, title: title.trim(), body: body.trim(), city: city.trim() || null });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setWriting(false);
    setKind(null);
    setTitle('');
    setBody('');
    void load();
  }

  const shown = rows.filter((o) => filter === 'all' || o.kind === filter);

  return (
    <Screen eyebrow="Community" title="Opportunities" intro="Jobs, referrals and ventures, shared within a network you can trust.">
      <CommunityGate>
        {!profile ? (
          <JoinPrompt text="Make a short profile to post an opportunity. Reading is open to every verified member." />
        ) : writing ? (
          <Card>
            <Choice label="What is it?" options={OPPORTUNITY_KINDS.map((k) => ({ value: k, label: OPPORTUNITY_KIND_LABEL[k] }))} value={kind} onChange={setKind} />
            <Field label="Title" value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Part-time accounts assistant" />
            <Field label="Details" value={body} onChangeText={setBody} multiline maxLength={2000} placeholder="What, where, and how members should reach you (send you a message request)." />
            <Field label="City" value={city} onChangeText={setCity} maxLength={60} />
            {error ? <Banner>{error}</Banner> : null}
            <Button title="Post" onPress={post} busy={busy} disabled={!kind || title.trim().length < 4 || body.trim().length < 10} />
            <Button title="Cancel" variant="secondary" onPress={() => setWriting(false)} />
          </Card>
        ) : (
          <Button title="Post an opportunity" onPress={() => setWriting(true)} />
        )}
        <View style={{ height: 14 }} lightColor="transparent" darkColor="transparent" />
        <Filters
          options={[{ value: 'all' as const, label: 'All' }, ...OPPORTUNITY_KINDS.map((k) => ({ value: k, label: OPPORTUNITY_KIND_LABEL[k] }))]}
          value={filter}
          onChange={setFilter}
        />
        {shown.length === 0 ? <Empty title="Nothing here yet" text="Try another filter, or post the first one." /> : null}
        {shown.map((o) => {
          const who = people.get(o.author_id);
          return (
            <Card key={o.id} accent={o.status === 'open'}>
              <Tags items={[OPPORTUNITY_KIND_LABEL[o.kind], ...(o.status === 'closed' ? ['Closed'] : [])]} tone="gold" />
              <Text style={[communityStyles.cardTitle, { marginTop: 8 }]}>{o.title}</Text>
              <Text style={communityStyles.body}>{o.body}</Text>
              <Text style={[communityStyles.meta, { color: muted, marginBottom: 8 }]}>{[o.city, timeAgo(o.created_at)].filter(Boolean).join(' · ')}</Text>
              <PersonLine person={{ member_id: o.author_id, display_name: who?.display_name ?? 'Member', headline: who?.headline }} />
              <View style={communityStyles.row} lightColor="transparent" darkColor="transparent">
                {o.author_id === me ? (
                  <TextButton
                    title={o.status === 'open' ? 'Mark as filled' : 'Reopen'}
                    onPress={async () => {
                      await supabase.from('community_opportunities').update({ status: o.status === 'open' ? 'closed' : 'open' }).eq('id', o.id);
                      void load();
                    }}
                  />
                ) : (
                  <ReportLink kind="opportunity" id={o.id} />
                )}
              </View>
            </Card>
          );
        })}
      </CommunityGate>
    </Screen>
  );
}
