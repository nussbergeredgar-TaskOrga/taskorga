"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Pencil, Copy } from "lucide-react";
import { updateQuoteStatus, acceptQuote, sendQuoteEmail, duplicateQuote } from "@/lib/actions/quotes";
import { ConfirmSendDialog } from "@/components/confirm-send-dialog";
import type { QuoteStatus } from "@prisma/client";

type Action = "duplicate" | "email" | "markSent" | "accept" | "reject" | null;

function DuplicateButton({
  quoteId,
  pending,
  isActive,
  run,
}: {
  quoteId: string;
  pending: boolean;
  isActive: boolean;
  run: (action: Action, fn: () => Promise<unknown>) => void;
}) {
  return (
    <button
      disabled={pending}
      onClick={() => run("duplicate", () => duplicateQuote(quoteId))}
      className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-60"
    >
      <Copy size={15} />
      {isActive ? "Wird dupliziert …" : "Duplizieren"}
    </button>
  );
}

export function QuoteActions({
  quoteId,
  status,
  hasCustomerEmail,
}: {
  quoteId: string;
  status: QuoteStatus;
  hasCustomerEmail: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<Action>(null);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  function run(action: Action, fn: () => Promise<unknown>) {
    setError("");
    setActiveAction(action);
    startTransition(async () => {
      await fn();
      setActiveAction(null);
    });
  }

  function sendEmail() {
    setError("");
    setActiveAction("email");
    startTransition(async () => {
      const result = await sendQuoteEmail(quoteId);
      setActiveAction(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDialogOpen(false);
    });
  }

  if (status === "ACCEPTED") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-success font-medium">Angenommen – Auftrag wurde erstellt.</p>
        <DuplicateButton quoteId={quoteId} pending={pending} isActive={activeAction === "duplicate"} run={run} />
      </div>
    );
  }
  if (status === "REJECTED" || status === "EXPIRED") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-500">
          {status === "REJECTED" ? "Abgelehnt." : "Abgelaufen."} Möchtest du ein überarbeitetes
          Angebot erstellen?
        </p>
        <DuplicateButton quoteId={quoteId} pending={pending} isActive={activeAction === "duplicate"} run={run} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <Link
            href={`/angebote/${quoteId}/bearbeiten`}
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            <Pencil size={15} />
            Bearbeiten
          </Link>
        )}
        <DuplicateButton quoteId={quoteId} pending={pending} isActive={activeAction === "duplicate"} run={run} />
        {hasCustomerEmail ? (
          <button
            disabled={pending}
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-60"
          >
            <Mail size={15} />
            Per E-Mail senden
          </button>
        ) : (
          status === "DRAFT" && (
            <button
              disabled={pending}
              onClick={() => run("markSent", () => updateQuoteStatus(quoteId, "SENT"))}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-60"
            >
              {activeAction === "markSent" ? "Wird markiert …" : "Als versendet markieren"}
            </button>
          )
        )}
        <button
          disabled={pending}
          onClick={() => run("accept", () => acceptQuote(quoteId))}
          className="rounded-lg bg-success text-white px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {activeAction === "accept" ? "Wird angenommen …" : "Angebot annehmen → Auftrag erstellen"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm("Angebot wirklich als abgelehnt markieren?")) return;
            run("reject", () => updateQuoteStatus(quoteId, "REJECTED"));
          }}
          className="rounded-lg border border-danger text-danger px-3 py-2 text-sm font-medium hover:bg-danger/5 transition-colors disabled:opacity-60"
        >
          {activeAction === "reject" ? "Wird abgelehnt …" : "Ablehnen"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}

      <ConfirmSendDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPreview={() => router.push(`/angebote/${quoteId}/vorschau`)}
        onSendDirect={sendEmail}
        documentLabel="Angebot"
        sending={pending && activeAction === "email"}
      />
    </div>
  );
}
