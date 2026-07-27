"use client";

export function ConfirmSendDialog({
  open,
  onClose,
  onPreview,
  onSendDirect,
  documentLabel,
  sending,
}: {
  open: boolean;
  onClose: () => void;
  onPreview: () => void;
  onSendDirect: () => void;
  documentLabel: string;
  sending: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-card shadow-cardHover max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-semibold text-lg text-ink-900">
          {documentLabel} wirklich versenden?
        </h2>
        <p className="text-sm text-ink-500">
          Der Kunde erhält es direkt per E-Mail mit PDF im Anhang. Wir empfehlen, dir vorher in
          der Vorschau die Positionen, Beträge und Adresse anzusehen.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onPreview}
            className="flex-1 rounded-lg border border-brand-500 text-brand-700 text-sm font-medium px-4 py-2.5 hover:bg-brand-50 transition-colors"
          >
            Zur Vorschau
          </button>
          <button
            disabled={sending}
            onClick={onSendDirect}
            className="flex-1 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {sending ? "Wird gesendet …" : "Direkt versenden"}
          </button>
        </div>
        <button onClick={onClose} className="block mx-auto text-xs text-ink-500 hover:underline">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
