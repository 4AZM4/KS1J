import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Tables } from '@ks1j/shared';

import { Card, CommunityGate, PersonLine, ReportLink, Tags, TextButton, communityStyles, loadPeople, useMyProfile, type Person } from '@/components/Community';
import { PostList } from '@/components/Posts';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Membership = Tables<'community_group_members'>;

/** One group: its discussion, its members, and (for the owner) join requests to approve. */
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useMyProfile();
  const [group, setGroup] = useState<Tables<'community_groups'> | null>(null);
  const [roster, setRoster] = useState<Membership[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [tab, setTab] = useState<'talk' | 'members'>('talk');
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(async () => {
    const [{ data: g }, { data: r }] = await Promise.all([
      supabase.from('community_groups').select('*').eq('id', id).maybeSingle(),
      supabase.from('community_group_members').select('*').eq('group_id', id).order('created_at'),
    ]);
    setGroup(g);
    setRoster(r ?? []);
    setPeople(await loadPeople((r ?? []).map((m) => m.member_id)));
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const mine = roster.find((m) => m.member_id === me);
  const isMember = mine?.status === 'member';
  const isOwner = isMember && mine?.role === 'owner';
  const pending = roster.filter((m) => m.status === 'pending');
  const name = (m: string) => people.get(m)?.display_name ?? 'Member';

  if (!group) return <Screen eyebrow="Community" title="Group"><CommunityGate>{null}</CommunityGate></Screen>;

  return (
    <Screen eyebrow="Community" title={group.name} intro={group.description ?? undefined}>
      <CommunityGate needProfile>
        <Tags items={[group.private ? 'Private' : 'Open', group.kind === 'profession' ? 'Profession' : 'Interest']} tone="gold" />
        {!isMember ? (
          <Card>
            <Text style={communityStyles.body}>
              {mine?.status === 'pending' ? 'Your request is waiting for the group owner.' : 'Join this group to read and post.'}
            </Text>
            {!mine ? (
              <Button
                title={group.private ? 'Request to join' : 'Join'}
                onPress={async () => {
                  await supabase.from('community_group_members').insert({ group_id: group.id });
                  void load();
                }}
              />
            ) : null}
          </Card>
        ) : (
          <>
            <View style={[communityStyles.row, { marginBottom: 8 }]} lightColor="transparent" darkColor="transparent">
              <TextButton title="Discussion" tone={tab === 'talk' ? 'tint' : 'muted'} onPress={() => setTab('talk')} />
              <TextButton
                title={`Members (${roster.filter((m) => m.status === 'member').length})${isOwner && pending.length ? ` · ${pending.length} waiting` : ''}`}
                tone={tab === 'members' ? 'tint' : 'muted'}
                onPress={() => setTab('members')}
              />
            </View>
            {tab === 'talk' ? (
              <PostList groupId={group.id} canPost />
            ) : (
              <>
                {isOwner && pending.length ? <SectionLabel>Asking to join</SectionLabel> : null}
                {isOwner
                  ? pending.map((m) => (
                      <Card key={m.member_id} accent>
                        <PersonLine person={{ member_id: m.member_id, display_name: name(m.member_id), headline: people.get(m.member_id)?.headline }} />
                        <Button
                          title="Approve"
                          onPress={async () => {
                            await supabase.from('community_group_members').update({ status: 'member' }).eq('group_id', group.id).eq('member_id', m.member_id);
                            void load();
                          }}
                        />
                        <Button
                          title="Decline"
                          variant="secondary"
                          onPress={async () => {
                            await supabase.from('community_group_members').delete().eq('group_id', group.id).eq('member_id', m.member_id);
                            void load();
                          }}
                        />
                      </Card>
                    ))
                  : null}
                <SectionLabel>Members</SectionLabel>
                {roster
                  .filter((m) => m.status === 'member')
                  .map((m) => (
                    <Card key={m.member_id}>
                      <PersonLine person={{ member_id: m.member_id, display_name: name(m.member_id), headline: people.get(m.member_id)?.headline }} sub={m.role === 'owner' ? 'Group owner' : undefined} />
                    </Card>
                  ))}
                {!isOwner ? (
                  <Button
                    title="Leave group"
                    variant="secondary"
                    onPress={async () => {
                      await supabase.from('community_group_members').delete().eq('group_id', group.id).eq('member_id', me ?? '');
                      router.back();
                    }}
                  />
                ) : (
                  <Text style={[communityStyles.meta, { color: muted }]}>You started this group.</Text>
                )}
              </>
            )}
          </>
        )}
        <View style={{ marginTop: 12 }} lightColor="transparent" darkColor="transparent">
          {!isOwner ? <ReportLink kind="group" id={group.id} /> : null}
        </View>
      </CommunityGate>
    </Screen>
  );
}
