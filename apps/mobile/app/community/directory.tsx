import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { Card, CommunityGate, Empty, Filters, PersonLine, Tags, communityStyles, useMyProfile, type Person } from '@/components/Community';
import { Screen } from '@/components/Screen';
import { Text, useThemeColor } from '@/components/Themed';
import { Button, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Show = 'all' | 'mentors' | 'open';

/**
 * Find verified members by name, profession, skill or city. With ?mentors=1 it opens as the Mentorship
 * circle: members who offer their time, each with "Request a call".
 */
export default function DirectoryScreen() {
  const params = useLocalSearchParams<{ mentors?: string }>();
  const mentorsMode = params.mentors === '1';
  const { profile } = useMyProfile();
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState('');
  const [show, setShow] = useState<Show>(mentorsMode ? 'mentors' : 'all');
  const [profession, setProfession] = useState('all');
  const muted = useThemeColor({}, 'mutedText');

  useFocusEffect(
    useCallback(() => {
      void supabase
        .from('community_profiles')
        .select('member_id, display_name, headline, profession, industry, city, skills, is_mentor, mentor_areas, open_to_work')
        .eq('listed', true)
        .order('display_name')
        .then(({ data }) => setPeople((data ?? []) as Person[]));
    }, []),
  );

  const professions = useMemo(() => [...new Set(people.map((p) => p.profession).filter((p): p is string => !!p))].sort(), [people]);
  const cities = new Set(people.map((p) => p.city).filter(Boolean)).size;

  const needle = q.trim().toLowerCase();
  const shown = people.filter((p) => {
    if (show === 'mentors' && !p.is_mentor) return false;
    if (show === 'open' && !p.open_to_work) return false;
    if (profession !== 'all' && p.profession !== profession) return false;
    if (!needle) return true;
    return [p.display_name, p.headline, p.profession, p.industry, p.city, ...p.skills, ...p.mentor_areas]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(needle));
  });

  return (
    <Screen
      title={mentorsMode ? 'Mentorship circle' : 'Directory'}
      intro={
        mentorsMode
          ? 'Members of our community who give their time and experience. Ask for a call; they choose when to say yes.'
          : 'Find verified members by name, profession, skill or city. Phone numbers are never shown.'
      }>
      <CommunityGate>
        {mentorsMode && profile && !profile.is_mentor ? (
          <Button title="Become a mentor" variant="secondary" onPress={() => router.push('/community/profile')} />
        ) : null}
        <Text style={[communityStyles.meta, { color: muted, marginBottom: 12 }]}>
          {people.length} {people.length === 1 ? 'member' : 'members'} listed · {cities} {cities === 1 ? 'city' : 'cities'}
        </Text>
        <Field label="Search" value={q} onChangeText={setQ} placeholder="Name, skill or city" autoCorrect={false} />
        <Filters
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'mentors', label: 'Mentors' },
            { value: 'open', label: 'Open to work' },
          ]}
          value={show}
          onChange={setShow}
        />
        {professions.length > 1 ? (
          <Filters options={[{ value: 'all', label: 'All professions' }, ...professions.map((p) => ({ value: p, label: p }))]} value={profession} onChange={setProfession} />
        ) : null}
        {shown.length === 0 ? <Empty title="Nobody matches" text="Try a different word or filter." /> : null}
        {shown.map((p) => (
          <Card key={p.member_id} accent={p.is_mentor && show === 'mentors'}>
            <PersonLine person={p} />
            <Text style={[communityStyles.meta, { color: muted }]}>{[p.profession, p.city].filter(Boolean).join(' · ')}</Text>
            <Tags items={[...(p.open_to_work ? ['Open to work'] : []), ...(p.is_mentor ? ['Mentor'] : [])]} tone="gold" />
            <Tags items={show === 'mentors' ? p.mentor_areas : p.skills} />
            {show === 'mentors' && p.member_id !== profile?.member_id ? (
              <Button title="Request a call" onPress={() => router.push({ pathname: '/community/person', params: { id: p.member_id, ask: 'call' } })} />
            ) : null}
          </Card>
        ))}
      </CommunityGate>
    </Screen>
  );
}
