import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AdminRole, Tables } from '@ks1j/shared';

import { supabase } from '@/lib/supabase';

type AuthState = {
  loading: boolean;
  session: Session | null;
  member: Tables<'members'> | null;
  roles: AdminRole[];
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Tables<'members'> | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setMember(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    const [{ data: m }, { data: r }] = await Promise.all([
      supabase.from('members').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('member_roles').select('role').eq('member_id', s.user.id),
    ]);
    setMember(m ?? null);
    setRoles((r ?? []).map((x) => x.role));
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void load(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return (
    <AuthContext.Provider
      value={{ loading, session, member, roles, signOut: async () => void (await supabase.auth.signOut()) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
