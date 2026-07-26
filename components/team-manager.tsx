"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { UserPlus, Trash2 } from "lucide-react";
import { createUser, updateUserRole, deleteUser, type CreateUserState } from "@/lib/actions/team";

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

function UserRow({ user, currentUserId }: { user: TeamUser; currentUserId: string }) {
  const [pending, startTransition] = useTransition();

  return (
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
            startTransition(() => updateUserRole(user.id, e.target.value as "Admin" | "Mitarbeiter"))
          }
          className="text-xs rounded-lg border border-ink-100 px-2 py-1.5 bg-surface outline-none"
        >
          <option value="Admin">Admin</option>
          <option value="Mitarbeiter">Mitarbeiter</option>
        </select>
        {user.id !== currentUserId && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`${user.name} wirklich aus dem Team entfernen?`)) {
                startTransition(() => deleteUser(user.id));
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
            an die Person weitergeben. Passwort kann sich die Person später selbst ändern.
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
