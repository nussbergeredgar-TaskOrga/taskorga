import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Status-Farben für den "Status-Thread" (farbiger linker Rand an Karten/Zeilen)
// zentrale Stelle, damit jeder Workspace dieselbe visuelle Sprache nutzt
export const statusColor: Record<string, string> = {
  // Anfrage
  NEW: "border-l-ink-300",
  CALLBACK_SCHEDULED: "border-l-brand-500",
  CALL_DONE: "border-l-brand-500",
  QUOTE_CREATED: "border-l-turquoise-500",
  WON: "border-l-success",
  LOST: "border-l-danger",
  // Angebot
  DRAFT: "border-l-ink-300",
  SENT: "border-l-brand-500",
  ACCEPTED: "border-l-success",
  REJECTED: "border-l-danger",
  EXPIRED: "border-l-warning",
  // Auftrag
  PLANNED: "border-l-ink-300",
  IN_PROGRESS: "border-l-brand-500",
  DONE: "border-l-success",
  CANCELLED: "border-l-danger",
  // Rechnung
  OPEN: "border-l-warning",
  PARTIALLY_PAID: "border-l-warning",
  PAID: "border-l-success",
  OVERDUE: "border-l-danger",
};
