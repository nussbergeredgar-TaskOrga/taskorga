"use client";

import { signOut } from "next-auth/react";

export function BillingRequiredSignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-ink-500 hover:text-danger transition-colors"
    >
      Abmelden
    </button>
  );
}
