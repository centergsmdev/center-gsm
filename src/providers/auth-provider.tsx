"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { authApi, type AuthUser } from "@/lib/supabase/auth-api";
import type {
  DemoAddress,
  DemoUser,
  NotificationPreferences,
} from "@/types/account";
import type { Tables } from "@/types/database";

const emptyUser: DemoUser = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
};
type Result = {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
};
type AuthContextValue = {
  isAuthenticated: boolean;
  isReady: boolean;
  user: DemoUser;
  addresses: DemoAddress[];
  preferences: NotificationPreferences;
  login: (email: string, password: string) => Promise<Result>;
  register: (
    firstName: string,
    lastName: string,
    phone: string,
    email: string,
    password: string,
  ) => Promise<Result>;
  logout: () => Promise<void>;
  updateProfile: (profile: DemoUser) => Promise<Result>;
  addAddress: (
    address: Omit<DemoAddress, "id" | "isDefault">,
  ) => Promise<Result>;
  updateAddress: (address: DemoAddress) => Promise<Result>;
  deleteAddress: (id: string) => Promise<Result>;
  setDefaultAddress: (id: string) => Promise<Result>;
  updatePreferences: (preferences: NotificationPreferences) => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);

const mapAddress = (item: Tables<"addresses">): DemoAddress => ({
  id: item.id,
  title: item.title,
  recipient: item.recipient_name,
  phone: item.phone,
  address: item.address_line,
  city: item.city,
  district: item.district,
  neighborhood: item.neighborhood ?? "",
  postalCode: item.postal_code ?? "",
  isDefault: item.is_default,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState(emptyUser);
  const [addresses, setAddresses] = useState<DemoAddress[]>([]);
  const [isReady, setReady] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: true,
    campaigns: false,
    orders: true,
  });
  const loadAccount = useCallback(async (current: AuthUser | null) => {
    setAuthUser(current);
    if (!current) {
      setUser(emptyUser);
      setAddresses([]);
      setReady(true);
      return;
    }
    const client = createClient();
    if (!client) {
      setReady(true);
      return;
    }
    const [profile, addressRows] = await Promise.all([
      client.from("profiles").select("*").eq("id", current.id).maybeSingle(),
      client
        .from("addresses")
        .select("*")
        .eq("user_id", current.id)
        .order("is_default", { ascending: false })
        .order("created_at"),
    ]);
    const row = profile.data;
    setUser({
      firstName:
        row?.first_name ?? String(current.user_metadata.first_name ?? ""),
      lastName: row?.last_name ?? String(current.user_metadata.last_name ?? ""),
      email: current.email ?? "",
      phone: row?.phone ?? String(current.user_metadata.phone ?? ""),
      birthDate: row?.birth_date ?? "",
    });
    setAddresses(addressRows.data?.map(mapAddress) ?? []);
    setReady(true);
  }, []);
  useEffect(() => {
    const client = createClient();
    if (!client) {
      setReady(true);
      return;
    }
    const auth = authApi(client);
    void auth
      .getSession()
      .then(({ data }) => loadAccount(data.session?.user ?? null));
    const { data } = auth.onAuthStateChange(
      (_event, session) => void loadAccount(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, [loadAccount]);
  const login = useCallback(
    async (email: string, password: string): Promise<Result> => {
      const client = createClient();
      if (!client)
        return { success: false, error: "Supabase Auth yapılandırılmamış." };
      const result = await authApi(client).signInWithPassword({
        email: email.trim(),
        password,
      });
      if (result.error)
        return { success: false, error: "E-posta veya şifre hatalı." };
      await client.rpc("record_customer_login", {});
      return { success: true };
    },
    [],
  );
  const register = useCallback(
    async (
      firstName: string,
      lastName: string,
      phone: string,
      email: string,
      password: string,
    ): Promise<Result> => {
      const client = createClient();
      if (!client)
        return { success: false, error: "Supabase Auth yapılandırılmamış." };
      const result = await authApi(client).signUp({
        email: email.trim(),
        password,
        options: {
          data: { first_name: firstName, last_name: lastName, phone },
          emailRedirectTo: `${window.location.origin}/hesabim`,
        },
      });
      if (result.error)
        return {
          success: false,
          error: "Kayıt oluşturulamadı. E-posta adresini kontrol edin.",
        };
      return { success: true, requiresEmailConfirmation: !result.data.session };
    },
    [],
  );
  const logout = useCallback(async () => {
    const client = createClient();
    if (client) await authApi(client).signOut();
    await loadAccount(null);
  }, [loadAccount]);
  const updateProfile = useCallback(
    async (profile: DemoUser): Promise<Result> => {
      const client = createClient();
      if (!client || !authUser)
        return { success: false, error: "Oturum bulunamadı." };
      const db = await client
        .from("profiles")
        .update({
          first_name: profile.firstName.trim(),
          last_name: profile.lastName.trim(),
          phone: profile.phone.trim(),
          birth_date: profile.birthDate || null,
        })
        .eq("id", authUser.id);
      if (db.error) return { success: false, error: "Profil güncellenemedi." };
      if (profile.email !== authUser.email) {
        const email = await authApi(client).updateUser({
          email: profile.email.trim(),
        });
        if (email.error)
          return {
            success: false,
            error:
              "Profil güncellendi ancak e-posta değişikliği başlatılamadı.",
          };
      }
      setUser(profile);
      return { success: true };
    },
    [authUser],
  );
  const refreshAddresses = useCallback(async () => {
    const client = createClient();
    if (!client || !authUser) return;
    const result = await client
      .from("addresses")
      .select("*")
      .eq("user_id", authUser.id)
      .order("is_default", { ascending: false })
      .order("created_at");
    if (result.data) setAddresses(result.data.map(mapAddress));
  }, [authUser]);
  const addAddress = useCallback(
    async (address: Omit<DemoAddress, "id" | "isDefault">): Promise<Result> => {
      const client = createClient();
      if (!client || !authUser)
        return { success: false, error: "Oturum bulunamadı." };
      const result = await client.from("addresses").insert({
        user_id: authUser.id,
        title: address.title,
        recipient_name: address.recipient,
        phone: address.phone,
        city: address.city,
        district: address.district,
        neighborhood: address.neighborhood || null,
        postal_code: address.postalCode || null,
        address_line: address.address,
        is_default: addresses.length === 0,
      });
      if (result.error) return { success: false, error: "Adres eklenemedi." };
      await refreshAddresses();
      return { success: true };
    },
    [addresses.length, authUser, refreshAddresses],
  );
  const updateAddress = useCallback(
    async (address: DemoAddress): Promise<Result> => {
      const client = createClient();
      if (!client || !authUser)
        return { success: false, error: "Oturum bulunamadı." };
      const result = await client
        .from("addresses")
        .update({
          title: address.title,
          recipient_name: address.recipient,
          phone: address.phone,
          city: address.city,
          district: address.district,
          neighborhood: address.neighborhood || null,
          postal_code: address.postalCode || null,
          address_line: address.address,
        })
        .eq("id", address.id)
        .eq("user_id", authUser.id);
      if (result.error)
        return { success: false, error: "Adres güncellenemedi." };
      await refreshAddresses();
      return { success: true };
    },
    [authUser, refreshAddresses],
  );
  const deleteAddress = useCallback(
    async (id: string): Promise<Result> => {
      const client = createClient();
      if (!client || !authUser)
        return { success: false, error: "Oturum bulunamadı." };
      const result = await client
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.id);
      if (result.error) return { success: false, error: "Adres silinemedi." };
      await refreshAddresses();
      return { success: true };
    },
    [authUser, refreshAddresses],
  );
  const setDefaultAddress = useCallback(
    async (id: string): Promise<Result> => {
      const client = createClient();
      if (!client || !authUser)
        return { success: false, error: "Oturum bulunamadı." };
      const clear = await client
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", authUser.id);
      if (clear.error)
        return { success: false, error: "Varsayılan adres değiştirilemedi." };
      const result = await client
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", authUser.id);
      if (result.error)
        return { success: false, error: "Varsayılan adres değiştirilemedi." };
      await refreshAddresses();
      return { success: true };
    },
    [authUser, refreshAddresses],
  );
  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(authUser),
      isReady,
      user,
      addresses,
      preferences,
      login,
      register,
      logout,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      updatePreferences: setPreferences,
    }),
    [
      addAddress,
      addresses,
      authUser,
      deleteAddress,
      isReady,
      login,
      logout,
      preferences,
      register,
      setDefaultAddress,
      updateAddress,
      updateProfile,
      user,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
