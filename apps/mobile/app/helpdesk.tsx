import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { isRulingQuestion, HELPDESK_EXAMPLES, HELPDESK_RULING, type HelpdeskReply } from '@ks1j/shared';

import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Choice, Field } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';


/** Answers only from Jamaat-approved texts, with the source shown, or says it does not know. */
export default function HelpdeskScreen() {
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<HelpdeskReply | null>(null);
  const [asked, setAsked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setBusy(true);
    setError(null);
    setReply(null);
    setAsked(text);
    try {
      // Rulings are redirected straight away (the server checks again).
      if (isRulingQuestion(text)) {
        setReply({ outcome: 'ruling', answer: HELPDESK_RULING, sources: [] });
      } else {
        const { data, error } = await supabase.functions.invoke<HelpdeskReply>('helpdesk', { body: { question: text } });
        if (error) throw error;
        setReply(data);
      }
      setQuestion('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Jamaat helpdesk" intro="Answers come only from texts the Jamaat has approved, with the source shown.">
      <Field
        label="Your question"
        value={question}
        onChangeText={setQuestion}
        multiline
        maxLength={500}
        placeholder="For example: when does my loan repayment start?"
      />
      <Button title="Ask" onPress={() => ask(question)} disabled={question.trim().length < 3} busy={busy} />
      {!reply && !busy ? (
        <Choice
          label="Or try"
          value={null}
          onChange={(q) => ask(q)}
          options={HELPDESK_EXAMPLES.map((q) => ({ value: q, label: q }))}
        />
      ) : null}

      {error ? <Banner>{error}</Banner> : null}

      {reply ? (
        <View style={styles.reply} lightColor="transparent" darkColor="transparent">
          <Text style={[styles.asked, { color: muted }]}>You asked: {asked}</Text>
          {reply.outcome === 'ruling' ? <Banner tone="info">{reply.answer ?? ''}</Banner> : null}
          {reply.outcome === 'unknown' ? <Banner tone="info">{reply.answer ?? ''}</Banner> : null}
          {reply.outcome === 'answered' ? (
            <View style={[styles.answer, { backgroundColor: card, borderColor: border }]}>
              <Text style={styles.answerText}>{reply.answer}</Text>
            </View>
          ) : null}
          {reply.outcome === 'passages' ? (
            <Text style={[styles.note, { color: muted }]}>Here is what the Jamaat&apos;s approved texts say:</Text>
          ) : null}

          {reply.sources.length > 0 ? <SectionLabel>{reply.outcome === 'answered' ? 'Sources' : 'From the texts'}</SectionLabel> : null}
          {reply.sources.map((s) => (
            <View key={s.n} style={[styles.source, { borderColor: border }]} lightColor="transparent" darkColor="transparent">
              <Text style={styles.sourceTitle}>
                [{s.n}] {s.title}
                {s.heading ? `: ${s.heading}` : ''}
              </Text>
              {reply.outcome === 'passages' ? <Text style={styles.excerpt}>{s.excerpt}</Text> : null}
              <Text style={[styles.ref, { color: muted }]}>{s.sourceRef}</Text>
            </View>
          ))}
          <Button title="Ask another question" variant="secondary" onPress={() => setReply(null)} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reply: { marginTop: 16 },
  asked: { fontSize: 15, marginBottom: 10 },
  answer: { borderWidth: 1, borderRadius: 14, padding: 16 },
  answerText: { fontSize: 17, lineHeight: 25 },
  note: { fontSize: 16, marginBottom: 4 },
  source: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, marginBottom: 14 },
  sourceTitle: { fontSize: 16, fontWeight: '700' },
  excerpt: { fontSize: 16, lineHeight: 23, marginTop: 4 },
  ref: { fontSize: 14, marginTop: 4 },
});
