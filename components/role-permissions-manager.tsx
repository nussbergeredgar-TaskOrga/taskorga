"use client";

import { useState, useTransition } from "react";
import { updateRolePermissions } from "@/lib/actions/team";
import type { Permissions } from "@/lib/permissions";

type Role = { id: string; name: string; permissions: Permissions };

const TOGGLES: { key: keyof Permissions; label: string }[] = [
  { key: "finanzen", label: "Finanzen einsehen" },
  { key: "einblicke", label: "Einblicke einsehen" },
  { key: "dokumentVorlagen", label: "Dokumentvorlagen anpassen" },
];

export function RolePermissionsManager({ roles }: { roles: Role[] }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, Permissions>>(
    Object.fromEntries(roles.map((r) => [r.id, r.permissions]))
  );

  function toggle(roleId: string, key: keyof Permissions) {
    const next = { ...state[roleId], [key]: !state[roleId]?.[key] };
    setState((s) => ({ ...s, [roleId]: next }));
    startTransition(async () => {
      await updateRolePermissions(roleId, next);
    });
  }

  if (roles.length === 0) {
    return <p className="text-sm text-ink-500">Keine weiteren Rollen außer Admin vorhanden.</p>;
  }

  return (
    <div className="space-y-2">
      {roles.map((role) => (
        <div
          key={role.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-100 px-4 py-3"
        >
          <span className="text-sm font-medium text-ink-900">{role.name}</span>
          <div className="flex flex-wrap items-center gap-4">
            {TOGGLES.map((t) => (
              <label key={t.key} className="flex items-center gap-1.5 text-xs text-ink-700">
                <input
                  type="checkbox"
                  checked={state[role.id]?.[t.key] === true}
                  disabled={pending}
                  onChange={() => toggle(role.id, t.key)}
                  className="rounded border-ink-100"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
