"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
}: {
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex gap-1 border-b border-ink-100 overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              active === i
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-900"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-5">{tabs[active].content}</div>
    </div>
  );
}
