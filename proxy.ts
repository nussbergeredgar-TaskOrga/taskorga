import type { NextFetchEvent } from "next/server";
import withAuth, { type NextRequestWithAuth } from "next-auth/middleware";

// Login-Pflicht fuer alle Bereiche hinter dem Dashboard. Seit Next 16 heisst die
// Middleware "proxy" und muss eine echte Funktion exportieren -- ein reiner
// Re-Export von next-auth/middleware wird nicht mehr erkannt.
export default function proxy(request: NextRequestWithAuth, event: NextFetchEvent) {
  return withAuth(request, event);
}

export const config = {
  matcher: [
    "/",
    "/heute/:path*",
    "/kunden/:path*",
    "/anfragen/:path*",
    "/angebote/:path*",
    "/aufgaben/:path*",
    "/termine/:path*",
    "/arbeit/:path*",
    "/finanzen/:path*",
    "/einblicke/:path*",
    "/kunden-radar/:path*",
    "/einstellungen/:path*",
    "/suche/:path*",
  ],
};
