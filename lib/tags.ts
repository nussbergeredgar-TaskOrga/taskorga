// Datensatztypen, an die Tags vergeben werden koennen. Der Schluessel wird von
// der Tag-Auswahl (components/tag-picker.tsx) und den Server Actions
// (lib/actions/tags.ts) gemeinsam verwendet.
export const TAG_ENTITIES = {
  customer: { relation: "customers", path: (id: string) => `/kunden/${id}`, listPath: "/kunden" },
  inquiry: { relation: "inquiries", path: (id: string) => `/anfragen/${id}`, listPath: "/anfragen" },
  appointment: { relation: "appointments", path: (id: string) => `/termine/${id}`, listPath: "/termine" },
  quote: { relation: "quotes", path: (id: string) => `/angebote/${id}`, listPath: "/angebote" },
  project: { relation: "projects", path: (id: string) => `/arbeit/${id}`, listPath: "/arbeit" },
  invoice: { relation: "invoices", path: (id: string) => `/finanzen/${id}`, listPath: "/finanzen" },
  task: { relation: "tasks", path: (id: string) => `/aufgaben/${id}`, listPath: "/aufgaben" },
} as const;

export type TagEntity = keyof typeof TAG_ENTITIES;

export type TagItem = { id: string; name: string; groupId: string | null };

export type TagCatalog = {
  groups: { id: string; name: string; tags: TagItem[] }[];
  ungrouped: TagItem[];
};

export function flattenTagCatalog(catalog: TagCatalog): TagItem[] {
  return [...catalog.groups.flatMap((g) => g.tags), ...catalog.ungrouped];
}
