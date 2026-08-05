export type SignatureCompany = {
  id: string;
  name: string;
  email?: string | null;
  logoUrl?: string | null;
  emailSignatureName?: string | null;
  emailSignatureRole?: string | null;
  emailSignatureText?: string | null;
};

export function buildSignatureHtml(company: SignatureCompany): string {
  // Der Blob-Store ist privat -- die gespeicherte logoUrl ist fuer den
  // E-Mail-Client des Empfaengers nicht direkt aufrufbar. Stattdessen wird
  // auf eine stabile, oeffentliche Weiterleitung verlinkt, die bei jedem
  // Abruf frisch eine kurzlebige, signierte URL ausstellt -- funktioniert
  // dadurch auch noch, wenn die E-Mail erst Wochen spaeter geoeffnet wird.
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const logoSrc = company.logoUrl ? `${baseUrl}/api/public/logo/${company.id}` : null;
  return `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #E8EAED;font-size:13px;color:#5B636D;line-height:1.5;">
      ${logoSrc ? `<img src="${logoSrc}" alt="${company.name}" style="height:40px;margin-bottom:10px;display:block;" />` : ""}
      ${company.emailSignatureName ? `<p style="margin:0;font-weight:600;color:#1C2128;">${company.emailSignatureName}</p>` : ""}
      ${company.emailSignatureRole ? `<p style="margin:0;">${company.emailSignatureRole}</p>` : ""}
      <p style="margin:${company.emailSignatureName ? "4px" : "0"} 0 0;font-weight:600;color:#1C2128;">${company.name}</p>
      ${company.emailSignatureText ? `<p style="margin:8px 0 0;white-space:pre-line;">${company.emailSignatureText}</p>` : ""}
    </div>
  `;
}
