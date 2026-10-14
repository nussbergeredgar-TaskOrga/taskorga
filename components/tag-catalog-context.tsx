"use client";

import { createContext, useContext } from "react";
import type { TagCatalog } from "@/lib/tags";

type TagCatalogValue = { catalog: TagCatalog; isAdmin: boolean };

const EMPTY: TagCatalogValue = { catalog: { groups: [], ungrouped: [] }, isAdmin: false };

const TagCatalogContext = createContext<TagCatalogValue>(EMPTY);

// Stellt den Tag-Katalog der Firma einmal im Dashboard-Layout bereit, damit
// Tag-Auswahlen tief in Listen (Ansprechpartner, Dokumente, Ausgaben) ohne
// durchgereichte Props auskommen.
export function TagCatalogProvider({
  catalog,
  isAdmin,
  children,
}: {
  catalog: TagCatalog;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return <TagCatalogContext.Provider value={{ catalog, isAdmin }}>{children}</TagCatalogContext.Provider>;
}

export function useTagCatalog(): TagCatalogValue {
  return useContext(TagCatalogContext);
}
