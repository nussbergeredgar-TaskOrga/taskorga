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
  inquiry: [
    { key: "amount", label: "Geschätzter Betrag" },
    { key: "source", label: "Quelle" },
    { key: "description", label: "Beschreibung" },
  ],
  task: [
    { key: "description", label: "Beschreibung" },
    { key: "dueDate", label: "Fällig am" },
    { key: "priority", label: "Priorität" },
    { key: "assigneeId", label: "Zugewiesen an" },
    { key: "customerId", label: "Kunde" },
  ],
  appointment: [{ key: "amount", label: "Betrag" }],
};

export const FORM_LABELS: Record<string, string> = {
  customer: "Kundenformular",
  inquiry: "Anfragen-Formular",
  task: "Aufgaben-Formular",
  appointment: "Termin-Formular",
};
