"use client";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { authApi, type AuthUser } from "@/lib/supabase/auth-api";
import { createAuditLog } from "@/lib/audit";

type AdminUser = { name: string; email: string; initials: string };
type LoginResult = { success: boolean; error?: string };
type Context = {
  user: AdminUser | null;
  isReady: boolean;
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
};
const AdminAuthContext = createContext<Context | null>(null);
const isAdmin = (user: AuthUser | null) => user?.app_metadata.role === "admin";
const mapUser = (user: AuthUser): AdminUser => ({
  name: String(
    user.user_metadata.name ??
      user.user_metadata.first_name ??
      "CENTER GSM Yönetici",
  ),
  email: user.email ?? "",
  initials: "CG",
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const client = createClient();
    if (!client) {
      setIsReady(true);
      return;
    }
    const auth = authApi(client);
    void auth.getSession().then(({ data }) => {
      setUser(
        data.session?.user && isAdmin(data.session.user)
          ? mapUser(data.session.user)
          : null,
      );
      setIsReady(true);
    });
    const { data } = auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user && isAdmin(session.user) ? mapUser(session.user) : null,
      );
      setIsReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const client = createClient();
      if (!client)
        return { success: false, error: "Supabase Auth yapılandırılmamış." };
      const auth = authApi(client);
      const result = await auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (result.error || !result.data.user)
        return { success: false, error: "E-posta veya şifre hatalı." };
      if (!isAdmin(result.data.user)) {
        await auth.signOut();
        return {
          success: false,
          error: "Bu hesabın yönetim paneli yetkisi bulunmuyor.",
        };
      }
      setUser(mapUser(result.data.user));
      await createAuditLog({
        action: "admin_login",
        entityType: "system",
        entityId: result.data.user.id,
        entityName: result.data.user.email ?? "Admin",
      });
      return { success: true };
    },
    [],
  );
  const logout = useCallback(async () => {
    const client = createClient();
    if (client) {
      await createAuditLog({
        action: "admin_logout",
        entityType: "system",
        entityName: user?.email ?? "Admin",
      });
      await authApi(client).signOut();
    }
    setUser(null);
    router.replace("/admin/giris");
    router.refresh();
  }, [router, user]);
  const value = useMemo(
    () => ({ user, isReady, login, logout }),
    [isReady, login, logout, user],
  );
  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("AdminAuthProvider gerekli.");
  return value;
}
