export type AuthUser = {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
};
export type AuthSession = { user: AuthUser } | null;
export type AuthError = { message: string } | null;
export type BrowserAuthApi = {
  getSession: () => Promise<{ data: { session: AuthSession } }>;
  getUser: () => Promise<{ data: { user: AuthUser | null }; error: AuthError }>;
  onAuthStateChange: (
    callback: (event: string, session: AuthSession) => void,
  ) => { data: { subscription: { unsubscribe: () => void } } };
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ data: { user: AuthUser | null }; error: AuthError }>;
  signUp: (credentials: {
    email: string;
    password: string;
    options: { data: Record<string, string>; emailRedirectTo: string };
  }) => Promise<{
    data: { user: AuthUser | null; session: AuthSession };
    error: AuthError;
  }>;
  signOut: () => Promise<{ error: AuthError }>;
  resetPasswordForEmail: (
    email: string,
    options: { redirectTo: string },
  ) => Promise<{ error: AuthError }>;
  updateUser: (attributes: {
    email?: string;
    password?: string;
  }) => Promise<{ data: { user: AuthUser | null }; error: AuthError }>;
};
export const authApi = (client: { auth: unknown }) =>
  client.auth as BrowserAuthApi;
