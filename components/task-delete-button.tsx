"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteFreeTask } from "@/lib/actions/free-tasks";

export function TaskDeleteButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Diese Aufgabe wirklich löschen?")) {
          startTransition(async () => {
            await deleteFreeTask(taskId);
            router.push("/aufgaben");
          });
        }
      }}
      className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-danger transition-colors"
    >
      <Trash2 size={15} />
      Löschen
    </button>
  );
}
