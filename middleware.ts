export { default } from "next-auth/middleware";

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
