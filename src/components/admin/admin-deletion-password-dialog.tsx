"use client";

import { KeyRound, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminDeletionPasswordDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError("");
    setPending(false);
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return setError("Silme şifresini girin.");
    setPending(true);
    setError("");
    const result = await onConfirm(password);
    setPending(false);
    if (result) return setError(result);
    onClose();
  }

  return (
    <AdminModal
      open={open}
      onClose={() => !pending && onClose()}
      title={title}
      description="Bu işlem geri alınamaz."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-950">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
          <p>{description}</p>
        </div>
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-black text-zinc-900">
            <KeyRound className="size-4" /> Özel silme şifresi
          </span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            autoFocus
            invalid={Boolean(error)}
            placeholder="Silme şifresini girin"
            disabled={pending}
          />
        </label>
        {error ? (
          <p className="text-sm font-bold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Siliniyor…" : "Kalıcı Olarak Sil"}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}
