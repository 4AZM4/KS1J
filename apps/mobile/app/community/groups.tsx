import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { GROUP_KIND_LABEL, type Tables } from '@ks1j/shared';

import { Card, CommunityGate, Empty, JoinPrompt, Tags, communityStyles, useMyProfile } from '@/components/Community';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Choice, Field } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';

type Group = Tables<'community_groups'>;
type Membership = Pick<Tables<'community_group_members'>, 'group_id' | 'member_id' | 'status' | 'role'>;

/** Profession circles and shared interests. Text discussions only, by design. */
export default function GroupsScreen() {
  const { profile, me } = useMyProfile();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [kind, setKind] = useState<'profession' | 'interest' | null>(null);
  const [priv, setPriv] = useState<'open' | 'private'>('open');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(async () => {
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from('community_groups').select('*').order('name'),
      supabase.from('community_group_members').select('group_id, member_id, status, role'),
    ]);
    setGroups(g ?? []);
    setMembers(m ?? []);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function create() {
    if (!kind) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('community_groups')
      .insert({ name: name.trim(), kind, description: about.trim() || null, private: priv === 'private' })
      .select('id')
      .single();
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setCreating(false);
    router.push({ pathname: '/community/group', params: { id: data.id } });
  }

  async function join(g: Group) {
    await supabase.from('community_group_members').insert({ group_id: g.id });
    if (!g.private) router.push({ pathname: '/community/group', params: { id: g.id } });
    void load();
  }

  const myStatus = (g: string) => members.find((m) => m.group_id === g && m.member_id === me)?.status;
  // Rosters are visible only to members, so the count is shown only where we can see it.
  const count = (g: string) => members.filter((m) => m.group_id === g && m.status === 'member').length;

  const section = (k: 'profession' | 'interest') => {
    const list = groups.filter((g) => g.kind === k);
    return (
      <>
        <SectionLabel>{GROUP_KIND_LABEL[k]}</SectionLabel>
        {list.length === 0 ? <Text style={[communityStyles.meta, { color: muted, marginBottom: 12 }]}>No groups yet.</Text> : null}
        {list.map((g) => {
          const status = myStatus(g.id);
          return (
            <Card key={g.id} accent={status === 'member'}>
              <Text style={communityStyles.cardTitle}>{g.name}</Text>
              <Tags items={[g.private ? 'Private' : 'Open', ...(status === 'member' ? ['Joined'] : status === 'pending' ? ['Waiting for approval'] : [])]} tone="gold" />
              {g.description ? <Text style={[communityStyles.body, { marginTop: 8 }]}>{g.description}</Text> : null}
              {status === 'member' ? (
                <>
                  <Text style={[communityStyles.meta, { color: muted }]}>{count(g.id)} {count(g.id) === 1 ? 'member' : 'members'}</Text>
                  <Button title="Open" onPress={() => router.push({ pathname: '/community/group', params: { id: g.id } })} />
                </>
              ) : status === 'pending' ? null : profile ? (
                <Button title={g.private ? 'Request to join' : 'Join'} onPress={() => join(g)} />
              ) : null}
            </Card>
          );
        })}
      </>
    );
  };

  return (
    <Screen eyebrow="Community" title="Groups" intro="Profession circles and shared interests. Text discussions only, by design.">
      <CommunityGate>
        {!profile ? (
          <JoinPrompt text="Make a short profile to join or start a group." />
        ) : creating ? (
          <Card>
            <Field label="Group name" value={name} onChangeText={setName} maxLength={60} />
            <Choice label="Kind" options={[{ value: 'profession' as const, label: 'Profession' }, { value: 'interest' as const, label: 'Interest' }]} value={kind} onChange={setKind} />
            <Field label="What is it for?" value={about} onChangeText={setAbout} multiline maxLength={300} />
            <Choice
              label="Who can join"
              options={[
                { value: 'open' as const, label: 'Open', note: 'Any verified member' },
                { value: 'private' as const, label: 'Private', note: 'You approve each request' },
              ]}
              value={priv}
              onChange={setPriv}
            />
            {error ? <Banner>{error}</Banner> : null}
            <Button title="Create group" onPress={create} busy={busy} disabled={!kind || name.trim().length < 3} />
            <Button title="Cancel" variant="secondary" onPress={() => setCreating(false)} />
          </Card>
        ) : (
          <Button title="Create a group" variant="secondary" onPress={() => setCreating(true)} />
        )}
        <View style={{ height: 8 }} lightColor="transparent" darkColor="transparent" />
        {groups.length === 0 ? <Empty title="No groups yet" /> : null}
        {section('profession')}
        {section('interest')}
      </CommunityGate>
    </Screen>
  );
}
