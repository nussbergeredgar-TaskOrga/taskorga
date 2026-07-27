"use client";

import { useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { UserPlus, Trash2, KeyRound } from "lucide-react";
import { createUser, updateUserRole, deleteUser, resetUserPassword, type CreateUserState } from "@/lib/actions/team";

type TeamUser = { id: string; name: string; email: string; roleName: string };

const initialState: CreateUserState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      <UserPlus size={15} />
      {pending ? "Wird angelegt …" : "Nutzer anlegen"}
    </button>
  );
}

function ResetPasswordRow({ userId, onClose }: { userId: string; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    const value = inputRef.current?.value ?? "";
    setError("");
    startTransition(async () => {
      const result = await resetUserPassword(userId, value);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDone(true);
      setTimeout(onClose, 1500);
    });
  }

  return (
    <div className="flex items-center gap-2 pb-2.5 border-b border-ink-100 last:border-0 pl-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="Neues Passwort (mind. 8 Zeichen)"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="flex-1 rounded-lg border border-ink-100 px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-surface"
      />
      <button
        disabled={pending}
        onClick={submit}
        className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-50 whitespace-nowrap"
      >
        {pending ? "…" : "Setzen"}
      </button>
      <button onClick={onClose} className="text-xs text-ink-500 hover:text-danger transition-colors">
        Abbrechen
      </button>
      {error && <span className="text-xs text-danger whitespace-nowrap">{error}</span>}
      {done && <span className="text-xs text-success whitespace-nowrap">Gesetzt.</span>}
    </div>
  );
}

function UserRow({ user, currentUserId }: { user: TeamUser; currentUserId: string }) {
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-2.5 border-b border-ink-100 last:border-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">
            {user.name} {user.id === currentUserId && <span className="text-ink-300 font-normal">(du)</span>}
          </p>
          <p className="text-xs text-ink-500 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={user.roleName}
            disabled={pending}
            onChange={(e) =>
              startTransition(async () => {
                await updateUserRole(user.id, e.target.value as "Admin" | "Mitarbeiter");
              })
            }
            className="text-xs rounded-lg border border-ink-100 px-2 py-1.5 bg-surface outline-none"
          >
            <option value="Admin">Admin</option>
            <option value="Mitarbeiter">Mitarbeiter</option>
          </select>
          <button
            onClick={() => setResetting((r) => !r)}
            className="p-1.5 text-ink-300 hover:text-brand-700 transition-colors"
            aria-label="Passwort zurücksetzen"
            title="Passwort zurücksetzen"
          >
            <KeyRound size={15} />
          </button>
          {user.id !== currentUserId && (
            <button
              disabled={pending}
              onClick={() => {
                if (confirm(`${user.name} wirklich aus dem Team entfernen?`)) {
                  startTransition(async () => {
                    await deleteUser(user.id);
                  });
                }
              }}
              className="p-1.5 text-ink-300 hover:text-danger transition-colors"
              aria-label="Entfernen"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      {resetting && <ResetPasswordRow userId={user.id} onClose={() => setResetting(false)} />}
    </div>
  );
}

export function TeamManager({ users, currentUserId }: { users: TeamUser[]; currentUserId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState(createUser, initialState);

  return (
    <div>
      <div>
        {users.map((u) => (
          <UserRow key={u.id} user={u} currentUserId={currentUserId} />
        ))}
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 mt-4 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
        >
          <UserPlus size={15} />
          Nutzer einladen
        </button>
      ) : (
        <form action={formAction} className="mt-4 space-y-2 rounded-lg border border-ink-100 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input name="name" placeholder="Name" className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface" />
            <input name="email" type="email" placeholder="E-Mail" className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface" />
            <input name="password" type="text" placeholder="Startpasswort" className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface" />
            <select name="roleName" defaultValue="Mitarbeiter" className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface">
              <option value="Mitarbeiter">Mitarbeiter</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <p className="text-xs text-ink-300">
            Es wird noch keine Einladungs-E-Mail verschickt — bitte E-Mail und Startpasswort selbst
            an die Person weitergeben. Passwort kann sich die Person später selbst ändern, oder du
            setzt es über das Schlüssel-Symbol jederzeit neu.
          </p>
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          {state.success && <p className="text-xs text-success">Nutzer wurde angelegt.</p>}
          <div className="flex gap-2">
            <SubmitButton />
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
