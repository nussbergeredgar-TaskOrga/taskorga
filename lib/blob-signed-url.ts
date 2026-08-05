import { issueSignedToken, presignUrl } from "@vercel/blob";

// Der Speicher-Store ist auf "private" eingestellt -- gespeicherte Blob-URLs
// sind nicht mehr direkt abrufbar. Um eine Datei anzuzeigen/herunterzuladen,
// muss bei jedem Zugriff neu eine kurzlebige, signierte URL ausgestellt
// werden (Delegationstoken + Signatur, serverseitig, nie im Client sichtbar).
export async function getSignedFileUrl(pathname: string, ttlMs = 5 * 60 * 1000): Promise<string> {
  const signedToken = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil: Date.now() + ttlMs,
  });
  const { presignedUrl } = await presignUrl(signedToken, {
    operation: "get",
    pathname,
    access: "private",
  });
  return presignedUrl;
}

// Extrahiert den Pfad innerhalb des Stores aus einer beim Upload
// gespeicherten Blob-URL (z.B. ".../rechnung-a3f9c2.pdf" -> "rechnung-a3f9c2.pdf").
export function pathnameFromBlobUrl(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

// Fuer generierte PDFs (react-pdf ruft die Bild-URL selbst serverseitig ab)
// und E-Mail-HTML wird eine bereits aufgeloeste Firma mit signierter
// logoUrl gebraucht -- Aufrufstelle bekommt eine flache Kopie zurueck, das
// Original bleibt unveraendert.
export async function resolveCompanyLogoUrl<T extends { logoUrl?: string | null }>(company: T): Promise<T> {
  if (!company.logoUrl) return company;
  return { ...company, logoUrl: await getSignedFileUrl(pathnameFromBlobUrl(company.logoUrl)) };
}
