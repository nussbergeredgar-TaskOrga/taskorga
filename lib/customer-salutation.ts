type SalutationCustomer = {
  salutation?: "HERR" | "FRAU" | "DIVERS" | null;
  lastName?: string | null;
  type?: "PRIVATE" | "BUSINESS";
};

// "Sehr geehrter Herr Müller" / "Sehr geehrte Frau Müller" / "Guten Tag Müller"
// Fällt auf "Sehr geehrte Damen und Herren" zurück, wenn nichts hinterlegt ist
// (z.B. Geschäftskunden ohne Ansprechpartner-Anrede).
export function getSalutationGreeting(customer: SalutationCustomer): string {
  if (customer.lastName) {
    if (customer.salutation === "HERR") return `Sehr geehrter Herr ${customer.lastName}`;
    if (customer.salutation === "FRAU") return `Sehr geehrte Frau ${customer.lastName}`;
    if (customer.salutation === "DIVERS") return `Guten Tag ${customer.lastName}`;
  }
  return "Sehr geehrte Damen und Herren";
}

// Kurzform für E-Mail-Anreden, z.B. "Hallo Herr Müller" / "Hallo" als Fallback
export function getSalutationShort(customer: SalutationCustomer): string {
  if (customer.lastName) {
    if (customer.salutation === "HERR") return `Hallo Herr ${customer.lastName}`;
    if (customer.salutation === "FRAU") return `Hallo Frau ${customer.lastName}`;
    if (customer.salutation === "DIVERS") return `Hallo ${customer.lastName}`;
  }
  return "Hallo";
}
