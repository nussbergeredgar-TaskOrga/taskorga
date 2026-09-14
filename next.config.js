const { withSentryConfig } = require("@sentry/nextjs");

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

// Ohne SENTRY_AUTH_TOKEN (noch kein Sentry-Projekt eingerichtet) laesst
// withSentryConfig den Source-Map-Upload beim Build einfach still ausfallen --
// der Build selbst schlaegt dadurch nicht fehl.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  disableLogger: true,
  widenClientFileUpload: false,
});
