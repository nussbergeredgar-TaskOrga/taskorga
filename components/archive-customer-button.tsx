"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { archiveCustomer, unarchiveCustomer } from "@/lib/actions/customers";

export function ArchiveCustomerButton({ customerId, archived }: { customerId: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (archived) {
      startTransition(() => unarchiveCustomer(customerId));
      return;
    }
    if (!confirm("Kunde archivieren? Er wird dann nicht mehr in der aktiven Kundenliste angezeigt, alle Daten bleiben erhalten.")) return;
    startTransition(() => archiveCustomer(customerId));
  }

  return (
    <button
      disabled={pending}
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors shrink-0 disabled:opacity-60"
    >
      {archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
      {archived ? "Wieder aktivieren" : "Archivieren"}
    </button>
  );
}
