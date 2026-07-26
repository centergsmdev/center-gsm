"use client";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type LoginResult = {
  data: unknown;
  error: unknown;
};

export default function DebugAuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<LoginResult | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setResult({ data: null, error: "Supabase yapılandırılmamış." });
      setLoading(false);
      return;
    }

    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setResult({ data: response.data, error: response.error });
    setLoading(false);
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-lg border border-zinc-300 px-3"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-lg border border-zinc-300 px-3"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-zinc-950 px-5 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Testing…" : "Test Login"}
        </button>
      </form>

      {result ? (
        <pre className="mt-8 overflow-auto rounded-lg bg-zinc-950 p-5 text-sm text-zinc-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
