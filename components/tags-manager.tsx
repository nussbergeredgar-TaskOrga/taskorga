"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createTag,
  createTagGroup,
  deleteTag,
  deleteTagGroup,
  moveTagToGroup,
  renameTag,
  renameTagGroup,
} from "@/lib/actions/tags";
import type { TagCatalog, TagItem } from "@/lib/tags";

const INPUT_CLASS =
  "flex-1 min-w-0 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface";

type Result = { error?: string };

export function TagsManager({ catalog }: { catalog: TagCatalog }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");

  function run(fn: () => Promise<Result>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else onOk?.();
    });
  }

  const groupOptions = catalog.groups.map((g) => ({ id: g.id, name: g.name }));

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      {catalog.groups.map((g) => (
        <div key={g.id} className="rounded-lg border border-ink-100 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              key={g.name}
              defaultValue={g.name}
              aria-label="Gruppenname"
              onBlur={(e) => {
                const v = e.target.value;
                if (v.trim() && v !== g.name) run(() => renameTagGroup(g.id, v));
                else e.target.value = g.name;
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className={`${INPUT_CLASS} font-medium`}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const hint = g.tags.length > 0 ? ` Die ${g.tags.length} Tag(s) bleiben erhalten (ohne Gruppe).` : "";
                if (confirm(`Gruppe „${g.name}“ wirklich löschen?${hint}`)) run(() => deleteTagGroup(g.id));
              }}
              className="p-1.5 text-ink-300 hover:text-danger transition-colors"
              aria-label={`Gruppe „${g.name}“ löschen`}
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="space-y-2 pl-3">
            {g.tags.map((t) => (
              <TagRow key={t.id} tag={t} groups={groupOptions} pending={pending} run={run} />
            ))}
            <AddTag groupId={g.id} pending={pending} run={run} />
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-ink-100 p-3 space-y-2">
        <p className="text-sm font-medium text-ink-700">Ohne Gruppe</p>
        <div className="space-y-2 pl-3">
          {catalog.ungrouped.map((t) => (
            <TagRow key={t.id} tag={t} groups={groupOptions} pending={pending} run={run} />
          ))}
          {catalog.ungrouped.length === 0 && <p className="text-xs text-ink-500">Keine Tags ohne Gruppe.</p>}
          <AddTag groupId={null} pending={pending} run={run} />
        </div>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newGroup.trim()) return;
          run(() => createTagGroup(newGroup), () => setNewGroup(""));
        }}
      >
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="Neue Gruppe, z. B. Herkunft"
          className={INPUT_CLASS}
        />
        <button
          type="submit"
          disabled={pending || !newGroup.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-40"
        >
          <Plus size={14} /> Gruppe
        </button>
      </form>
    </div>
  );
}

function TagRow({
  tag,
  groups,
  pending,
  run,
}: {
  tag: TagItem;
  groups: { id: string; name: string }[];
  pending: boolean;
  run: (fn: () => Promise<Result>, onOk?: () => void) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        key={tag.name}
        defaultValue={tag.name}
        aria-label="Tag-Name"
        onBlur={(e) => {
          const v = e.target.value;
          if (v.trim() && v !== tag.name) run(() => renameTag(tag.id, v));
          else e.target.value = tag.name;
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={INPUT_CLASS}
      />
      <select
        value={tag.groupId ?? ""}
        disabled={pending}
        aria-label="Gruppe"
        onChange={(e) => run(() => moveTagToGroup(tag.id, e.target.value || null))}
        className="max-w-[9rem] rounded-lg border border-ink-100 bg-surface px-2 py-2 text-sm outline-none focus:border-brand-500"
      >
        <option value="">Ohne Gruppe</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`Tag „${tag.name}“ wirklich löschen? Er wird überall entfernt, wo er vergeben ist.`)) {
            run(() => deleteTag(tag.id));
          }
        }}
        className="p-1.5 text-ink-300 hover:text-danger transition-colors"
        aria-label={`Tag „${tag.name}“ löschen`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function AddTag({
  groupId,
  pending,
  run,
}: {
  groupId: string | null;
  pending: boolean;
  run: (fn: () => Promise<Result>, onOk?: () => void) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        run(() => createTag(value, groupId), () => setValue(""));
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Neuer Tag"
        className={INPUT_CLASS}
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-40"
      >
        <Plus size={14} /> Tag
      </button>
    </form>
  );
}
