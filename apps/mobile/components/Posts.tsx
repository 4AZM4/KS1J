import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { timeAgo, type Tables } from '@ks1j/shared';

import { Card, Empty, Filters, JoinPrompt, PersonLine, ReportLink, TextButton, communityStyles, loadPeople, useMyProfile, type Person } from '@/components/Community';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Field } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';

type Post = Tables<'community_posts'>;

/**
 * Posts for everyone, or a group's discussion when `groupId` is given. Text only, by design.
 * Shared by the feed and each group screen.
 */
export function PostList({ groupId, canPost }: { groupId: string | null; canPost: boolean }) {
  const { profile, me } = useMyProfile();
  const [scope, setScope] = useState<'everyone' | 'mine'>('everyone');
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [likes, setLikes] = useState<{ post_id: string; member_id: string }[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(async () => {
    let q = supabase.from('community_posts').select('*').eq('removed', false).order('created_at', { ascending: false }).limit(50);
    q = groupId ? q.eq('group_id', groupId) : q.is('group_id', null);
    const { data } = await q;
    const rows = data ?? [];
    setPosts(rows);
    setPeople(await loadPeople(rows.map((p) => p.author_id)));
    if (rows.length) {
      const { data: a } = await supabase.from('community_appreciations').select('post_id, member_id').in('post_id', rows.map((p) => p.id));
      setLikes(a ?? []);
    } else setLikes([]);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function post() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('community_posts').insert({ body: text.trim(), group_id: groupId });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setText('');
    void load();
  }

  async function toggleLike(id: string, mine: boolean) {
    if (!me) return;
    if (mine) await supabase.from('community_appreciations').delete().eq('post_id', id).eq('member_id', me);
    else await supabase.from('community_appreciations').insert({ post_id: id });
    void load();
  }

  const shown = scope === 'mine' ? posts.filter((p) => p.author_id === me) : posts;

  return (
    <>
      {canPost ? (
        profile ? (
          <Card>
            <Field label={groupId ? "Share with the group" : "Share with the community"} value={text} onChangeText={setText} multiline maxLength={2000} placeholder="An achievement, a question or a thank-you" />
            {error ? <Banner>{error}</Banner> : null}
            <Button title="Post" onPress={post} busy={busy} disabled={text.trim().length === 0} />
          </Card>
        ) : (
          <JoinPrompt text="Make a short profile to post. Reading is open to every verified member." />
        )
      ) : null}
      <Filters options={[{ value: 'everyone', label: 'Everyone' }, { value: 'mine', label: 'My posts' }]} value={scope} onChange={setScope} />
      {shown.length === 0 ? <Empty title="No posts yet" text={canPost ? 'Be the first to say salaam.' : undefined} /> : null}
      {shown.map((p) => {
        const who = people.get(p.author_id);
        const count = likes.filter((l) => l.post_id === p.id).length;
        const mine = likes.some((l) => l.post_id === p.id && l.member_id === me);
        return (
          <Card key={p.id}>
            <PersonLine person={{ member_id: p.author_id, display_name: who?.display_name ?? 'Member', headline: who?.headline }} />
            <Text style={[communityStyles.meta, { color: muted }]}>{timeAgo(p.created_at)}</Text>
            <Text style={[communityStyles.body, styles.body]}>{p.body}</Text>
            <View style={communityStyles.row} lightColor="transparent" darkColor="transparent">
              <TextButton title={`${mine ? 'Appreciated' : 'Appreciate'}${count ? ` · ${count}` : ''}`} onPress={() => toggleLike(p.id, mine)} tone={mine ? 'tint' : 'muted'} />
              {p.author_id === me ? (
                <TextButton
                  title="Delete"
                  tone="muted"
                  onPress={async () => {
                    await supabase.from('community_posts').delete().eq('id', p.id);
                    void load();
                  }}
                />
              ) : (
                <ReportLink kind="post" id={p.id} />
              )}
            </View>
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 10 },
});
