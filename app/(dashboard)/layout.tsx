import { NavSidebar } from "@/components/nav-sidebar";
import { TopBar } from "@/components/top-bar";
import { MobileNav } from "@/components/mobile-nav";
import { HelpBook } from "@/components/help-book";
import { BrandColorStyle } from "@/components/brand-color-style";
import { getNavConfig, getNavLabels } from "@/lib/actions/nav";
import { DEFAULT_NAV, NAV_CATALOG } from "@/lib/nav-items";
import { getCurrentUserWithRole, getCurrentCompany } from "@/lib/session";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

// Diese Menüpunkte sind nur mit passender Berechtigung sichtbar (die Seiten
// selbst sind zusätzlich über requirePermission() geschützt, das hier ist
// nur die Menü-Anzeige).
const PERMISSION_GATED_IDS = new Set<PermissionKey>(["finanzen", "einblicke"]);

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

  const allowedIds = new Set(
    NAV_CATALOG.filter(
      (item) => !PERMISSION_GATED_IDS.has(item.id as PermissionKey) || hasPermission(user.role, item.id as PermissionKey)
    ).map((item) => item.id)
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
