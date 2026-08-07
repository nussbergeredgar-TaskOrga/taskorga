// Einmalig auszufuehren, sobald STRIPE_SECRET_KEY in .env eingetragen ist:
//
//   node scripts/setup-stripe-price.js
//
// Legt bei Stripe das Produkt "TaskOrga Abo" und einen gestaffelten
// monatlichen Preis (graduated pricing) mit den vereinbarten Stufen an und
// druckt die entstandene Price-ID aus. Diese ID muss danach als
// STRIPE_PRICE_ID in .env (lokal) und in den Vercel-Projekteinstellungen
// (Produktion) eingetragen werden.
//
// Sicher mehrfach ausfuehrbar: legt bei jedem Lauf ein NEUES Produkt+Preis an
// (Stripe-Preise sind unveraenderlich) -- bei versehentlichem Doppellauf
// im Stripe-Dashboard unter Produkte das ueberzaehlige Produkt archivieren.

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const env = fs.readFileSync(envPath, "utf8");
const secretLine = env.split("\n").find((l) => l.startsWith("STRIPE_SECRET_KEY"));
const secretKey = secretLine ? secretLine.split("=").slice(1).join("=").replace(/^"|"$/g, "").trim() : "";

if (!secretKey) {
  console.error("STRIPE_SECRET_KEY fehlt in .env -- bitte zuerst dort eintragen.");
  process.exit(1);
}

const Stripe = require(path.join(__dirname, "..", "node_modules", "stripe"));
const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });

// Muss exakt der Staffel aus lib/subscription-pricing.ts entsprechen.
const TIERS = [
  { up_to: 4, unit_amount: 1900 },
  { up_to: 10, unit_amount: 1400 },
  { up_to: 25, unit_amount: 900 },
  { up_to: "inf", unit_amount: 400 },
];

(async () => {
  const product = await stripe.products.create({ name: "TaskOrga Abo" });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "eur",
    recurring: { interval: "month" },
    billing_scheme: "tiered",
    tiers_mode: "graduated",
    tiers: TIERS,
  });

  console.log("Produkt angelegt:", product.id);
  console.log("Price angelegt:", price.id);
  console.log("\nBitte in .env (und in den Vercel-Projekteinstellungen) eintragen:");
  console.log(`STRIPE_PRICE_ID="${price.id}"`);
})().catch((err) => {
  console.error("Fehler beim Anlegen bei Stripe:", err.message);
  process.exit(1);
});
