export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/heute/:path*",
    "/kunden/:path*",
    "/anfragen/:path*",
    "/angebote/:path*",
    "/arbeit/:path*",
    "/finanzen/:path*",
    "/einblicke/:path*",
    "/einstellungen/:path*",
    "/suche/:path*",
  ],
};
