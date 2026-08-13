"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateOwnName, changeOwnPassword, type ProfileState } from "@/lib/actions/profile";
import { PasswordInput } from "@/components/password-input";

const initialState: ProfileState = {};

function PasswordSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      {pending ? "Wird geändert …" : "Passwort ändern"}
    </button>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [nameValue, setNameValue] = useState(name);
  const [nameSaved, setNameSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pwState, pwAction] = useFormState(changeOwnPassword, initialState);

  function saveName() {
    if (nameValue.trim() === name) return;
    startTransition(async () => {
      await updateOwnName(nameValue);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink-500 mb-1">Name</label>
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
          {(pending || nameSaved) && (
            <p className="text-xs text-success mt-1">{pending ? "Wird gespeichert …" : "Gespeichert."}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">E-Mail</label>
          <input
            value={email}
            disabled
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm bg-ink-50 text-ink-500"
          />
        </div>
      </div>

      <div className="border-t border-ink-100 pt-5">
        <h3 className="text-sm font-medium text-ink-700 mb-3">Passwort ändern</h3>
        <form action={pwAction} className="space-y-3 max-w-sm">
          <PasswordInput
            name="currentPassword"
            placeholder="Aktuelles Passwort"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
          <PasswordInput
            name="newPassword"
            placeholder="Neues Passwort (mind. 8 Zeichen)"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
          <PasswordInput
            name="confirmPassword"
            placeholder="Neues Passwort wiederholen"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
          {pwState.error && <p className="text-xs text-danger">{pwState.error}</p>}
          {pwState.success && <p className="text-xs text-success">Passwort geändert.</p>}
          <PasswordSubmit />
        </form>
      </div>
    </div>
  );
}
