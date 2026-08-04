import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTotpCode, findBackupCodeIndex } from "@/lib/two-factor";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// Hinweis: Bewusst ohne expliziten "NextAuthOptions"-Typ, da dieser Import
// je nach next-auth-Version/TypeScript-Konfiguration Build-Fehler auf Vercel
// verursacht hat. TypeScript leitet den Typ hier automatisch korrekt ab.
export const authOptions = {
  // Ohne maxAge greift der NextAuth-Standard von 30 Tagen Inaktivität, was fuer
  // eine Anwendung mit Finanzdaten zu grosszuegig ist. Session laeuft nach
  // 7 Tagen Inaktivitaet ab; jede Anfrage verlaengert sie erneut (Rolling Session).
  session: { strategy: "jwt" as const, maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "E-Mail & Passwort",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
        twoFactorCode: { label: "Zwei-Faktor-Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          throw new Error(
            `Zu viele Fehlversuche. Bitte in ${minutesLeft} Minute${minutesLeft === 1 ? "" : "n"} erneut versuchen.`
          );
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          const attempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: attempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null,
            },
          });
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        // Zwei-Faktor-Code erst NACH erfolgreicher Passwortpruefung abfragen,
        // damit ein Angreifer ohne korrektes Passwort nicht einmal erfaehrt,
        // ob 2FA fuer dieses Konto aktiv ist.
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const code = credentials.twoFactorCode?.trim();
          if (!code) {
            throw new Error("2FA_REQUIRED");
          }

          const validTotp = verifyTotpCode(user.email, user.twoFactorSecret, code);
          if (!validTotp) {
            const backupIndex = await findBackupCodeIndex(user.twoFactorBackupCodes, code);
            if (backupIndex === -1) {
              throw new Error("Ungültiger Zwei-Faktor-Code.");
            }
            // Backup-Code ist nur einmal verwendbar -- danach entfernen.
            const remaining = [...user.twoFactorBackupCodes];
            remaining.splice(backupIndex, 1);
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorBackupCodes: remaining },
            });
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          companyId: user.companyId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.userId = (user as any).id;
        token.companyId = (user as any).companyId;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).companyId = token.companyId;
      }
      return session;
    },
  },
};
