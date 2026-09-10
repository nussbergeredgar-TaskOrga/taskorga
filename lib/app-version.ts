import packageJson from "../package.json";

// Aktuell nur die package.json-Versionsnummer -- Platzhalter, bis es ein
// echtes Release-/Changelog-System gibt (siehe Feature-Wunsch "Versions-
// Ankuendigungen"). Dann wird das hier durch eine verwaltete Versions-
// Kennung ersetzt.
export const APP_VERSION = packageJson.version;
