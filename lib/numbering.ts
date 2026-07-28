// Ersetzt Platzhalter im konfigurierten Nummernformat, z.B.
// "ANG-{YYYY}-{NNNN}" + Sequenz 12 -> "ANG-2026-0012"
export function generateDocumentNumber(format: string, sequence: number): string {
  const year = new Date().getFullYear();
  return format
    .replace("{YYYY}", String(year))
    .replace("{YY}", String(year).slice(-2))
    .replace("{NNNN}", String(sequence).padStart(4, "0"))
    .replace("{NNN}", String(sequence).padStart(3, "0"))
    .replace("{NN}", String(sequence).padStart(2, "0"));
}
