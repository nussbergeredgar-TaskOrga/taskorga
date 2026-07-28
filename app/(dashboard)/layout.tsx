import { NavSidebar } from "@/components/nav-sidebar";
import { TopBar } from "@/components/top-bar";
import { MobileNav } from "@/components/mobile-nav";
import { HelpBook } from "@/components/help-book";
import { BrandColorStyle } from "@/components/brand-color-style";
import { getNavConfig, getNavLabels } from "@/lib/actions/nav";
import { DEFAULT_NAV, NAV_CATALOG } from "@/lib/nav-items";
import { getCurrentUserWithRole, getCurrentCompany } from "@/lib/session";

// Diese Menüpunkte sind nur für Admins sichtbar (die Seiten selbst sind
// zusätzlich über requireAdmin() geschützt, das hier ist nur die Menü-Anzeige).
const ADMIN_ONLY_IDS = new Set(["finanzen", "einblicke"]);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, savedConfig, labels, company] = await Promise.all([
    getCurrentUserWithRole(),
    getNavConfig(),
    getNavLabels(),
    getCurrentCompany(),
  ]);
  const isAdmin = user.role?.name === "Admin";

  const allowedIds = new Set(
    NAV_CATALOG.filter((item) => isAdmin || !ADMIN_ONLY_IDS.has(item.id)).map((item) => item.id)
  );

  const config = (savedConfig ?? DEFAULT_NAV).filter((item) => allowedIds.has(item.id));

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <BrandColorStyle color={company.appAccentColor} />
      <NavSidebar config={config} labels={labels} />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileNav config={config} labels={labels} />
      <HelpBook />
    </div>
  );
}
