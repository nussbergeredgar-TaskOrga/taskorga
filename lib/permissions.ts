export type PermissionKey = "finanzen" | "einblicke";

export type Permissions = Partial<Record<PermissionKey, boolean>>;

// Die Admin-Rolle hat immer vollen Zugriff. Fuer alle anderen Rollen (z.B.
// "Mitarbeiter") entscheidet das gespeicherte Role.permissions-JSON --
// fehlt ein Schluessel, gilt das als "kein Zugriff" (sicherer Default,
// entspricht dem bisherigen fest verdrahteten Verhalten).
export function hasPermission(
  role: { name: string; permissions: unknown } | null | undefined,
  key: PermissionKey
): boolean {
  if (!role) return false;
  if (role.name === "Admin") return true;
  const perms = (role.permissions ?? {}) as Permissions;
  return perms[key] === true;
}
