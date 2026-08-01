// Server läuft unabhängig vom Hosting-Standort (z.B. Vercel = UTC) immer in der
// deutschen Zeitzone. Ohne das interpretiert new Date("2026-01-01T14:00") je nach
// Umgebung unterschiedlich (lokal ggf. Berlin, auf Vercel UTC) — dadurch konnten
// Termin-Uhrzeiten zwischen Server- und Client-Darstellung auseinanderlaufen.
process.env.TZ = "Europe/Berlin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
