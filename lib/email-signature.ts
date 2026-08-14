export type SignatureCompany = {
  id: string;
  name: string;
  email?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  emailSignatureName?: string | null;
  emailSignatureRole?: string | null;
  emailSignatureText?: string | null;
  documentAccentColor?: string | null;
};

const TASKORGA_BLUE = "#2F5FFF";
// TaskOrgas eigene Absender-Angaben (Impressum) -- fest verdrahtet, weil die
// vier System-Mails (Login/Konto) immer von TaskOrga selbst kommen, nicht von
// der Firma des jeweiligen Empfaengers (siehe renderSystemEmail unten).
const TASKORGA_FOOTER = {
  name: "Edgar Nussberger",
  role: "Gründer",
  orgName: "TaskOrga",
  addressLines: ["In der Mudersbach 6", "55469 Mutterschied"],
};

function baseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function taskorgaLogoUrl(): string {
  return `${baseUrl()}/icon-192.png`;
}

// Zentrale Huelle fuer alle sechs automatisch versendeten Mails: farbiger
// Header (Logo + Titel + optionaler Slogan), Fliesstext mit Gruss/Abschluss,
// dreispaltiger Footer (Name/Rolle -- Logo -- Anschrift). Tabellen statt
// Flexbox/Grid, weil viele Mail-Clients (allen voran Outlook Desktop) modernes
// CSS-Layout nicht zuverlaessig darstellen.
function renderEmailShell({
  accentColor,
  headerTitle,
  headerSubtitle,
  headerLogoUrl,
  greetingLine,
  bodyHtml,
  footerName,
  footerRole,
  footerOrgName,
  footerLogoUrl,
  footerAddressLines,
}: {
  accentColor: string;
  headerTitle: string;
  headerSubtitle?: string | null;
  headerLogoUrl?: string | null;
  greetingLine: string;
  bodyHtml: string;
  footerName?: string | null;
  footerRole?: string | null;
  footerOrgName: string;
  footerLogoUrl?: string | null;
  footerAddressLines?: string[];
}): string {
  const greeting = `${greetingLine},`;
  const addressLines = footerAddressLines?.filter(Boolean) ?? [];

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F7FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
            <tr>
              <td style="background-color:${accentColor};padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    ${
                      headerLogoUrl
                        ? `<td style="vertical-align:middle;padding-right:12px;">
                            <img src="${headerLogoUrl}" width="40" height="40" alt="${headerTitle}" style="display:block;border-radius:8px;" />
                          </td>`
                        : ""
                    }
                    <td style="vertical-align:middle;">
                      <div style="font-size:20px;font-weight:700;color:#FFFFFF;line-height:1.2;">${headerTitle}</div>
                      ${
                        headerSubtitle
                          ? `<div style="font-size:12px;color:#DCE4FF;line-height:1.3;margin-top:2px;">${headerSubtitle}</div>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;font-size:14px;line-height:1.6;color:#1C1C1C;">
                <p style="margin:0 0 14px;">${greeting}</p>
                ${bodyHtml}
                <p style="margin:20px 0 0;">Viele Grüße</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:${accentColor};padding:16px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;font-size:12.5px;color:#FFFFFF;line-height:1.5;width:34%;">
                      ${footerName ? `<strong style="color:#FFFFFF;">${footerName}</strong>` : ""}
                      ${footerName && footerRole ? "<br/>" : ""}
                      ${footerRole ?? ""}
                    </td>
                    <td style="vertical-align:middle;text-align:center;width:32%;">
                      ${
                        footerLogoUrl
                          ? `<img src="${footerLogoUrl}" width="56" height="56" alt="${footerOrgName}" style="display:inline-block;border-radius:12px;" />`
                          : ""
                      }
                    </td>
                    <td style="vertical-align:middle;text-align:right;font-size:12.5px;color:#FFFFFF;line-height:1.5;width:34%;">
                      ${footerOrgName ? `<strong style="color:#FFFFFF;">${footerOrgName}</strong>` : ""}
                      ${
                        addressLines.length
                          ? `<div style="margin-top:2px;font-size:10.5px;color:#DCE4FF;line-height:1.4;">${addressLines.join("<br/>")}</div>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

// Fuer die vier System-Mails (Registrierung, Passwort, Team-/Plattform-
// Einladung) -- kommen immer von TaskOrga selbst, daher feste eigene Angaben
// statt der Firma des Empfaengers.
export function renderSystemEmail({
  greetingName,
  bodyHtml,
}: {
  greetingName?: string | null;
  bodyHtml: string;
}): string {
  const firstName = greetingName?.trim().split(" ")[0];
  return renderEmailShell({
    accentColor: TASKORGA_BLUE,
    headerTitle: "TaskOrga",
    headerSubtitle: "Weniger Büro. Mehr Business.",
    headerLogoUrl: taskorgaLogoUrl(),
    greetingLine: firstName ? `Hallo ${firstName}` : "Hallo",
    bodyHtml,
    footerName: TASKORGA_FOOTER.name,
    footerRole: TASKORGA_FOOTER.role,
    footerOrgName: TASKORGA_FOOTER.orgName,
    footerLogoUrl: taskorgaLogoUrl(),
    footerAddressLines: TASKORGA_FOOTER.addressLines,
  });
}

// Fuer Mails, die eine Firma im eigenen Namen an ihre Kunden schickt
// (Zahlungserinnerung, Angebot/Rechnung) -- Header/Footer im selben Layout,
// aber mit den Angaben der sendenden Firma statt TaskOrga.
export function renderCompanyEmail({
  company,
  greetingLine,
  bodyHtml,
}: {
  company: SignatureCompany;
  greetingLine: string;
  bodyHtml: string;
}): string {
  const logoUrl = company.logoUrl ? `${baseUrl()}/api/public/logo/${company.id}` : null;
  const addressLines = [company.address, [company.zip, company.city].filter(Boolean).join(" ")].filter(
    (l): l is string => !!l
  );

  return renderEmailShell({
    accentColor: company.documentAccentColor || TASKORGA_BLUE,
    headerTitle: company.name,
    headerLogoUrl: logoUrl,
    greetingLine,
    bodyHtml,
    footerName: company.emailSignatureName,
    footerRole: company.emailSignatureRole,
    footerOrgName: company.name,
    footerLogoUrl: logoUrl,
    footerAddressLines: addressLines,
  });
}
