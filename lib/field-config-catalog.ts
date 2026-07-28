export type FieldCatalogEntry = { key: string; label: string };

export const FIELD_CATALOGS: Record<string, FieldCatalogEntry[]> = {
  customer: [
    { key: "salutation", label: "Anrede" },
    { key: "email", label: "E-Mail" },
    { key: "phone", label: "Telefon" },
    { key: "address", label: "Adresse" },
    { key: "zip", label: "PLZ" },
    { key: "city", label: "Ort" },
    { key: "notes", label: "Notizen" },
  ],
};

export const FORM_LABELS: Record<string, string> = {
  customer: "Kundenformular",
};
