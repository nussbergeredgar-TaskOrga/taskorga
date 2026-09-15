import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EmailVerificationGate } from "@/components/email-verification-gate";
import { VerifyStatus } from "@/components/verify-status";

// Zwei Faelle in einer Seite: mit Token (Klick auf den Link aus der Mail,
// funktioniert auch ohne Sitzung) oder ohne Token -- dann der harte
// Zugriffs-Riegel fuer eingeloggte, aber noch nicht verifizierte Nutzer
// (siehe app/(dashboard)/layout.tsx, das hierher umleitet).
export default async function EmailVerifizierenPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  if (searchParams.token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display font-semibold text-2xl text-ink-900">TaskOrga</h1>
            <p className="text-sm text-ink-500 mt-1">E-Mail-Adresse bestätigen</p>
          </div>
          <div className="bg-surface rounded-card border border-ink-100 shadow-card p-6">
            <VerifyStatus token={searchParams.token} />
          </div>
          <Link href="/login" className="block text-center text-xs text-ink-500 hover:underline mt-4">
            Zurück zum Login
          </Link>
        </div>
      </div>
    );
  }

  // Ohne Sitzung leitet getCurrentUser() selbst schon auf /login um.
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (dbUser.emailVerifiedAt) redirect("/heute");

  return <EmailVerificationGate email={dbUser.email} />;
}
