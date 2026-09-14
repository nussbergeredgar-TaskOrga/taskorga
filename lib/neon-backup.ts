const NEON_API_BASE = "https://console.neon.tech/api/v2";
// TaskOrga-Projekt bei Neon -- keine Geheimnisse, nur Ressourcen-IDs (siehe
// Memory project_sandbox_environments); der eigentliche Zugriff haengt allein
// am NEON_API_KEY.
const NEON_PROJECT_ID = "dry-poetry-92290212";
const PRODUCTION_BRANCH_ID = "br-cold-waterfall-agi41kjg";
const BACKUP_BRANCH_PREFIX = "backup-";
const BACKUP_RETENTION_DAYS = 14;

type NeonBranch = { id: string; name: string; created_at: string };

async function neonRequest(path: string, init?: RequestInit) {
  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey) throw new Error("NEON_API_KEY ist nicht konfiguriert.");
  const res = await fetch(`${NEON_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`Neon-API-Fehler (${res.status}): ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

// Taegliches Sicherheitsnetz zusaetzlich zu Neons eigenem Point-in-Time-Restore-
// Fenster (aktuell nur 6h auf diesem Plan). Ein Branch ist ein sofortiger,
// eigenstaendiger Copy-on-Write-Klon des production-Branches zum Erstellungs-
// zeitpunkt und bleibt bestehen, unabhaengig davon, wie weit man auf dem
// Quell-Branch selbst noch zeitreisen kann. Bewusst ohne eigenes Compute-
// Endpoint angelegt (kein "endpoints"-Feld im Request), damit dafuer keine
// laufenden Kosten entstehen -- nur Speicherplatz fuer abweichende Seiten.
// Ohne NEON_API_KEY (z.B. lokal) ein stiller No-Op.
export async function createDailyBackupBranch(): Promise<{
  created?: string;
  pruned: string[];
  skipped?: boolean;
  error?: string;
}> {
  if (!process.env.NEON_API_KEY) {
    return { pruned: [], skipped: true };
  }

  try {
    const todayLabel = new Date().toISOString().slice(0, 10);
    const branchName = `${BACKUP_BRANCH_PREFIX}${todayLabel}`;

    const { branches } = (await neonRequest(`/projects/${NEON_PROJECT_ID}/branches`)) as { branches: NeonBranch[] };

    // Idempotent bei mehrfachem Lauf am selben Tag (z.B. manueller Testaufruf).
    const alreadyExists = branches.some((b) => b.name === branchName);
    let created: string | undefined;
    if (!alreadyExists) {
      await neonRequest(`/projects/${NEON_PROJECT_ID}/branches`, {
        method: "POST",
        body: JSON.stringify({ branch: { parent_id: PRODUCTION_BRANCH_ID, name: branchName } }),
      });
      created = branchName;
    }

    const cutoff = new Date(Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const pruned: string[] = [];
    for (const b of branches) {
      if (!b.name.startsWith(BACKUP_BRANCH_PREFIX)) continue;
      if (new Date(b.created_at) >= cutoff) continue;
      await neonRequest(`/projects/${NEON_PROJECT_ID}/branches/${b.id}`, { method: "DELETE" });
      pruned.push(b.name);
    }

    return { created, pruned };
  } catch (err) {
    console.error("Neon-Backup-Branch fehlgeschlagen:", err);
    return { pruned: [], error: err instanceof Error ? err.message : String(err) };
  }
}
