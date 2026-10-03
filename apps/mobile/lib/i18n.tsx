import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { asLang, isRtl, translate, type Lang, type StringKey } from '@ks1j/shared';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const KEY = 'ks1j.language';
/** Set when a language is picked before signing in; saved to the profile on sign-in. */
const PENDING = 'ks1j.language.pending';

type LangState = {
  lang: Lang;
  rtl: boolean;
  t: (key: StringKey, vars?: Record<string, string>) => string;
  setLang: (lang: Lang) => Promise<void>;
};

const LangContext = createContext<LangState | null>(null);

/**
 * The member's app language. Saved on their profile (members.language) so it follows them to any phone,
 * and on the device so the sign-in screen is in their language too.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { member, session } = useAuth();
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setLangState(asLang(v)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!member) return;
    AsyncStorage.getItem(PENDING)
      .catch(() => null)
      .then(async (pending) => {
        if (pending && asLang(pending) !== asLang(member.language)) {
          // Picked on the sign-in screen: keep it and save it to the profile.
          setLangState(asLang(pending));
          await supabase.from('members').update({ language: asLang(pending) }).eq('id', member.id);
        } else {
          setLangState(asLang(member.language));
        }
        await AsyncStorage.removeItem(PENDING).catch(() => undefined);
      });
  }, [member]);

  const setLang = useCallback(
    async (next: Lang) => {
      setLangState(next);
      await AsyncStorage.setItem(KEY, next).catch(() => undefined);
      if (session) await supabase.from('members').update({ language: next }).eq('id', session.user.id);
      else await AsyncStorage.setItem(PENDING, next).catch(() => undefined);
    },
    [session],
  );

  const t = useCallback((key: StringKey, vars?: Record<string, string>) => translate(lang, key, vars), [lang]);

  return <LangContext.Provider value={{ lang, rtl: isRtl(lang), t, setLang }}>{children}</LangContext.Provider>;
}

export function useT(): LangState {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useT must be used inside LanguageProvider');
  return ctx;
}
