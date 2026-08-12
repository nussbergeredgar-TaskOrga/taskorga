import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PwaRegister } from "@/components/pwa-register";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/theme-script";
import { SplashScreen } from "@/components/splash-screen";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "TaskOrga",
  description: "Weniger Büro. Mehr Business.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaskOrga",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2F5FFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      // ThemeScript setzt die "dark"-Klasse hier noch vor dem ersten Rendern per
      // <script> direkt im DOM (siehe components/theme-script.tsx), damit beim Laden
      // im Dunkelmodus kein Hell-Modus aufblitzt. Der Server kennt die gespeicherte
      // Praeferenz aber nicht und rendert daher ohne diese Klasse -- ohne dieses Flag
      // wirft React beim Hydrieren einen Mismatch-Fehler und entfernt die Klasse kurz
      // wieder, was genau den Hell-Modus-Flash verursacht, den es zu vermeiden gilt.
      suppressHydrationWarning
    >
      <body>
        <ThemeScript />
        <SplashScreen />
        <Providers>{children}</Providers>
        <PwaRegister />
        <SpeedInsights />
      </body>
    </html>
  );
}
