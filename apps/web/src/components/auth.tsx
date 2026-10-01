"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AdminRole, Tables } from "@ks1j/shared";
import { supabase } from "@/lib/supabase";

type AuthState = {
  loading: boolean;
  session: Session | null;
  member: Tables<"members"> | null;
  roles: AdminRole[];
  hasRole: (role: AdminRole) => boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Tables<"members"> | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);

  const loadProfile = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setMember(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    const db = supabase();
    const [{ data: m }, { data: r }] = await Promise.all([
      db.from("members").select("*").eq("id", s.user.id).maybeSingle(),
      db.from("member_roles").select("role").eq("member_id", s.user.id),
    ]);
    setMember(m ?? null);
    setRoles((r ?? []).map((x) => x.role));
    setLoading(false);
  }, []);

  useEffect(() => {
    const db = supabase();
    db.auth.getSession().then(({ data }) => loadProfile(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_event, s) => {
      void loadProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const hasRole = (role: AdminRole) => roles.includes(role) || roles.includes("super_admin");

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        member,
        roles,
        hasRole,
        isStaff: roles.length > 0,
        signOut: async () => {
          await supabase().auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
