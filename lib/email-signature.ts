export type SignatureCompany = {
  name: string;
  email?: string | null;
  logoUrl?: string | null;
  emailSignatureName?: string | null;
  emailSignatureRole?: string | null;
  emailSignatureText?: string | null;
};

export function buildSignatureHtml(company: SignatureCompany): string {
  return `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #E8EAED;font-size:13px;color:#5B636D;line-height:1.5;">
      ${company.logoUrl ? `<img src="${company.logoUrl}" alt="${company.name}" style="height:40px;margin-bottom:10px;display:block;" />` : ""}
      ${company.emailSignatureName ? `<p style="margin:0;font-weight:600;color:#1C2128;">${company.emailSignatureName}</p>` : ""}
      ${company.emailSignatureRole ? `<p style="margin:0;">${company.emailSignatureRole}</p>` : ""}
      <p style="margin:${company.emailSignatureName ? "4px" : "0"} 0 0;font-weight:600;color:#1C2128;">${company.name}</p>
      ${company.emailSignatureText ? `<p style="margin:8px 0 0;white-space:pre-line;">${company.emailSignatureText}</p>` : ""}
    </div>
  `;
}
