import * as Print from 'expo-print';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
import { FUND_LABEL, KHUMS_GUIDANCE, formatDate, rupees } from '@ks1j/shared';

import { ART, Lattice } from '@/components/Art';
import { Screen } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DEMO_MODE, errorMessage, supabase } from '@/lib/supabase';

type Kind = 'donation' | 'lawajam' | 'loan';
type Receipt = { what: string; detail?: string; amount: number; paidAt: string | null; ref: string; khums: boolean };

async function loadReceipt(kind: Kind, id: string): Promise<Receipt | null> {
  if (kind === 'donation') {
    const { data } = await supabase
      .from('donations')
      .select('id, fund, amount, paid_at, gateway_ref, status, institution:institutions(name)')
      .eq('id', id)
      .eq('status', 'paid')
      .maybeSingle();
    if (!data) return null;
    const inst = (data as unknown as { institution: { name: string } | null }).institution;
    return {
      what: FUND_LABEL[data.fund],
      detail: inst ? `To ${inst.name}` : 'To a verified Jamaat case',
      amount: data.amount,
      paidAt: data.paid_at,
      ref: data.gateway_ref ?? data.id.slice(0, 8).toUpperCase(),
      khums: data.fund !== 'general',
    };
  }
  if (kind === 'lawajam') {
    const { data } = await supabase
      .from('lawajam_payments')
      .select('id, amount, paid_at, gateway_ref, status, due:lawajam_dues(period)')
      .eq('id', id)
      .eq('status', 'paid')
      .maybeSingle();
    if (!data) return null;
    const due = (data as unknown as { due: { period: string } | null }).due;
    return {
      what: 'Lawajam',
      detail: due ? `Household dues for ${due.period}` : 'Household dues',
      amount: data.amount,
      paidAt: data.paid_at,
      ref: data.gateway_ref ?? data.id.slice(0, 8).toUpperCase(),
      khums: false,
    };
  }
  const { data } = await supabase
    .from('loan_repayments')
    .select('id, amount, paid_at, gateway_ref, status')
    .eq('id', id)
    .eq('status', 'paid')
    .maybeSingle();
  if (!data) return null;
  return {
    what: 'Education loan repayment',
    detail: 'Interest-free (Qard-e-Hasana). Goes back into the fund for the next student.',
    amount: data.amount,
    paidAt: data.paid_at,
    ref: data.gateway_ref ?? data.id.slice(0, 8).toUpperCase(),
    khums: false,
  };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The same receipt as a printable page (save as PDF from the print dialog). */
function receiptHtml(r: Receipt, name: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>KS1J receipt ${esc(r.ref)}</title>
<style>body{font-family:Georgia,serif;color:#0b3a2c;margin:40px}.card{border:3px solid #c9a24a;border-radius:18px;padding:32px;max-width:560px}
h1{margin:0 0 4px;font-size:28px}.muted{color:#3d4f47;font-family:Arial,sans-serif;font-size:14px}.amt{font-size:40px;font-weight:bold;margin:20px 0}
table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:15px}td{padding:8px 0;border-top:1px solid #e3ece6}td:last-child{text-align:right;font-weight:bold}
.note{margin-top:18px;font-family:Arial,sans-serif;font-size:13px;color:#3d4f47}</style></head><body><div class="card">
<h1>KSI Jamaat Mumbai</h1><div class="muted">Payment receipt from KS1J${DEMO_MODE ? ' (demo, not a real payment)' : ''}</div>
<div class="amt">${esc(rupees(r.amount))}</div>
<table><tr><td>For</td><td>${esc(r.what)}</td></tr>${r.detail ? `<tr><td></td><td>${esc(r.detail)}</td></tr>` : ''}
<tr><td>Paid by</td><td>${esc(name)}</td></tr><tr><td>Date</td><td>${esc(formatDate(r.paidAt))}</td></tr>
<tr><td>Receipt number</td><td>${esc(r.ref)}</td></tr></table>
${r.khums ? `<p class="note">${esc(KHUMS_GUIDANCE)}</p>` : ''}
<p class="note">Recorded in the Jamaat ledger. Records are never edited; a correction is a new entry.</p></div></body></html>`;
}

/** Opens the print dialog for just the receipt. On the web, expo-print would print the whole app page instead. */
async function printReceipt(html: string) {
  if (Platform.OS !== 'web') {
    await Print.printAsync({ html });
    return;
  }
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) throw new Error('Printing is not available in this browser.');
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
}

export default function ReceiptScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const { member } = useAuth();
  const [r, setR] = useState<Receipt | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const muted = useThemeColor({}, 'mutedText');
  const border = useThemeColor({}, 'border');

  useEffect(() => {
    if (kind && id) void loadReceipt(kind, id).then(setR);
  }, [kind, id]);

  if (r === undefined) return <Screen title="Receipt"><Text style={{ color: muted }}>Loading…</Text></Screen>;
  if (r === null) {
    return (
      <Screen title="Receipt">
        <Text style={[styles.body, { color: muted }]}>There is no paid receipt here. Payments waiting for the bank have no receipt yet.</Text>
      </Screen>
    );
  }

  const name = member?.full_name ?? '';
  return (
    <Screen title="Receipt">
      <View style={[styles.receipt, { borderColor: ART.gold }]}>
        <View style={styles.head} lightColor={ART.deep} darkColor={ART.deep}>
          <Lattice id="lat-receipt" opacity={0.16} />
          <Image source={require('@/assets/images/ks1j-logo.png')} style={styles.badge} accessibilityIgnoresInvertColors />
          <View lightColor="transparent" darkColor="transparent" style={{ flex: 1 }}>
            <Text style={styles.org}>KSI Jamaat Mumbai</Text>
            <Text style={styles.orgSub}>Payment receipt{DEMO_MODE ? ' (demo)' : ''}</Text>
          </View>
        </View>
        <View style={styles.inner} lightColor="transparent" darkColor="transparent">
          <Text style={styles.amount}>{rupees(r.amount)}</Text>
          <Line k="For" v={r.what} border={border} muted={muted} />
          {r.detail ? <Text style={[styles.detail, { color: muted }]}>{r.detail}</Text> : null}
          <Line k="Paid by" v={name} border={border} muted={muted} />
          <Line k="Date" v={formatDate(r.paidAt)} border={border} muted={muted} />
          <Line k="Receipt number" v={r.ref} border={border} muted={muted} />
          {r.khums ? <Text style={[styles.detail, { color: muted }]}>{KHUMS_GUIDANCE}</Text> : null}
          <Text style={[styles.detail, { color: muted }]}>Recorded in the Jamaat ledger.</Text>
        </View>
      </View>
      {error ? <Banner>{error}</Banner> : null}
      <Button
        title="Save or print (PDF)"
        onPress={() => printReceipt(receiptHtml(r, name)).catch((e) => setError(errorMessage(e)))}
      />
    </Screen>
  );
}

function Line({ k, v, border, muted }: { k: string; v: string; border: string; muted: string }) {
  return (
    <View style={[styles.line, { borderTopColor: border }]} lightColor="transparent" darkColor="transparent">
      <Text style={[styles.body, { color: muted }]}>{k}</Text>
      <Text style={[styles.body, styles.strong]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  receipt: { borderWidth: 3, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, overflow: 'hidden' },
  badge: { width: 56, height: 56 },
  org: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  orgSub: { color: ART.mint, fontSize: 15, marginTop: 2 },
  inner: { padding: 18 },
  amount: { fontSize: 38, fontWeight: '800', marginBottom: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, paddingVertical: 10 },
  body: { fontSize: 16, lineHeight: 22 },
  strong: { fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  detail: { fontSize: 14, lineHeight: 20, marginTop: 6 },
});
