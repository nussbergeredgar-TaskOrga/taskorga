import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { getTagCatalog } from "@/lib/actions/tags";
import { CustomerImport } from "@/components/customer-import";

export default async function KundenImportPage() {
  await requireAdmin();
  const catalog = await getTagCatalog();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/kunden" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
          <ArrowLeft size={16} /> Zurück zu Kunden
        </Link>
        <h1 className="text-2xl font-semibold text-ink-900">Kunden importieren</h1>
        <p className="mt-1 text-sm text-ink-500">
          Lade eine CSV-Datei hoch, ordne die Spalten zu und lege fest, was bei allen importierten Kunden hinterlegt
          werden soll — zum Beispiel ein Tag.
        </p>
      </div>
      <CustomerImport catalog={catalog} />
    </div>
  );
}
