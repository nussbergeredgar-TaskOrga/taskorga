"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { updateExpenseStatus } from "@/lib/actions/expenses";

type Expense = {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  date: Date;
  status: "OPEN" | "PAID";
  documents: { id: string; fileName: string; fileUrl: string }[];
  project?: { id: string; title: string; number: string } | null;
};

function ExpenseRow({ expense }: { expense: Expense }) {
  const [pending, startTransition] = useTransition();
  const doc = expense.documents[0];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-ink-900 truncate">{expense.title}</p>
        <p className="text-xs text-ink-500">
          {expense.date.toLocaleDateString("de-DE")}
          {expense.category && ` · ${expense.category}`}
          {expense.project && (
            <>
              {" · "}
              <Link href={`/arbeit/${expense.project.id}`} className="text-brand-700 hover:underline">
                {expense.project.number}
              </Link>
            </>
          )}
          {doc && (
            <>
              {" · "}
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                <FileText size={11} /> Beleg
              </a>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-sm font-medium text-ink-900">{expense.amount.toLocaleString("de-DE")} €</span>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(() => updateExpenseStatus(expense.id, expense.status === "OPEN" ? "PAID" : "OPEN"))
          }
          className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-50 whitespace-nowrap"
        >
          {expense.status === "OPEN" ? "Als bezahlt markieren" : "Als offen markieren"}
        </button>
      </div>
    </div>
  );
}

export function ExpensesList({ title, expenses }: { title: string; expenses: Expense[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink-700 mb-2">
        {title} <span className="text-ink-300 font-mono">({expenses.length})</span>
      </h3>
      {expenses.length === 0 ? (
        <p className="text-sm text-ink-300">Keine Einträge.</p>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <ExpenseRow key={e.id} expense={e} />
          ))}
        </div>
      )}
    </div>
  );
}
