"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signUp, type SignupState } from "@/lib/actions/signup";
import { PasswordInput } from "@/components/password-input";

const initialState: SignupState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
    >
      {pending ? "Wird erstellt …" : "Konto erstellen"}
    </button>
  );
}

export function RegistrierenForm({
  inviteToken,
  inviteEmail,
  inviteInvalid,
  trialDays,
}: {
  inviteToken: string | null;
  inviteEmail: string | null;
  inviteInvalid: boolean;
  trialDays: number;
}) {
  const [state, formAction] = useFormState(signUp, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-semibold text-2xl text-ink-900">TaskOrga</h1>
          <p className="text-sm text-ink-500 mt-1">Neues Unternehmenskonto erstellen</p>
        </div>

        {inviteInvalid && (
          <p className="text-center text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mb-4">
            Dieser Einladungslink ist nicht mehr gültig. Du kannst dich trotzdem regulär registrieren.
          </p>
        )}

        <form
          action={formAction}
          className="bg-surface rounded-card border border-ink-100 shadow-card p-6 space-y-4"
        >
          {inviteToken && <input type="hidden" name="invite" value={inviteToken} />}

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Firmenname</label>
            <input
              name="companyName"
              required
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            {state.errors?.companyName && (
              <p className="text-xs text-danger mt-1">{state.errors.companyName[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Dein Name</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            {state.errors?.name && <p className="text-xs text-danger mt-1">{state.errors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">E-Mail</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={inviteEmail ?? undefined}
              readOnly={!!inviteEmail}
              className={`w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 ${
                inviteEmail ? "bg-ink-50 text-ink-500" : ""
              }`}
            />
            {state.errors?.email && <p className="text-xs text-danger mt-1">{state.errors.email[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Passwort</label>
            <PasswordInput
              name="password"
              required
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            {state.errors?.password && (
              <p className="text-xs text-danger mt-1">{state.errors.password[0]}</p>
            )}
            <p className="text-xs text-ink-300 mt-1">Mindestens 8 Zeichen.</p>
          </div>

          {state.message && <p className="text-sm text-danger">{state.message}</p>}

          <SubmitButton />

          <Link href="/login" className="block text-center text-xs text-ink-500 hover:underline">
            Schon ein Konto? Zum Login
          </Link>
        </form>

        <p className="text-center text-xs text-ink-300 mt-4">
          Dein Firmenkonto ist komplett von allen anderen Firmen getrennt. {trialDays} Tage kostenlos
          testen, danach jederzeit kündbar.
        </p>

        <p className="text-center text-xs text-ink-300 mt-3 space-x-2">
          <Link href="/impressum" className="hover:underline">
            Impressum
          </Link>
          <span>·</span>
          <Link href="/datenschutz" className="hover:underline">
            Datenschutz
          </Link>
        </p>
      </div>
    </div>
  );
}
