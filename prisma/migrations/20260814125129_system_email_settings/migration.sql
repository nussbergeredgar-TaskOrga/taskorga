-- CreateTable
CREATE TABLE "SystemEmailSettings" (
    "id" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL DEFAULT 'Edgar Nussberger',
    "signatureRole" TEXT NOT NULL DEFAULT 'Gründer',
    "signatureOrgName" TEXT NOT NULL DEFAULT 'TaskOrga',
    "signatureAddress1" TEXT DEFAULT 'In der Mudersbach 6',
    "signatureAddress2" TEXT DEFAULT '55469 Mutterschied',
    "headerSlogan" TEXT NOT NULL DEFAULT 'Weniger Büro. Mehr Business.',
    "resetSubject" TEXT NOT NULL DEFAULT 'Passwort zurücksetzen – TaskOrga',
    "resetIntro" TEXT NOT NULL DEFAULT 'klicke auf den folgenden Link, um dein TaskOrga-Passwort zurückzusetzen:',
    "resetOutro" TEXT NOT NULL DEFAULT 'Der Link ist eine Stunde lang gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.',
    "verifySubject" TEXT NOT NULL DEFAULT 'Bitte E-Mail-Adresse bestätigen – TaskOrga',
    "verifyIntro" TEXT NOT NULL DEFAULT 'bitte bestätige deine E-Mail-Adresse, um dein TaskOrga-Konto vollständig zu aktivieren:',
    "verifyOutro" TEXT NOT NULL DEFAULT 'Der Link ist 24 Stunden lang gültig. Falls du dieses Konto nicht erstellt hast, kannst du diese E-Mail ignorieren.',
    "teamInviteSubject" TEXT NOT NULL DEFAULT 'Dein TaskOrga-Zugang für {{firma}}',
    "teamInviteIntro" TEXT NOT NULL DEFAULT 'für dich wurde ein TaskOrga-Konto für {{firma}} angelegt.
Melde dich mit dieser E-Mail-Adresse und dem Startpasswort an, das dir von deinem Admin mitgeteilt wurde:',
    "teamInviteOutro" TEXT NOT NULL DEFAULT 'Falls du kein Startpasswort erhalten hast, kannst du auf der Login-Seite über „Passwort vergessen?“ selbst eines vergeben.',
    "platformInviteSubject" TEXT NOT NULL DEFAULT 'Du bist eingeladen: TaskOrga kostenlos testen',
    "platformInviteIntro" TEXT NOT NULL DEFAULT 'du wurdest eingeladen, TaskOrga {{tage}} Tage lang kostenlos zu testen.',
    "platformInviteOutro" TEXT NOT NULL DEFAULT 'Der Link ist 14 Tage lang gültig. Beim Registrieren legst du dein eigenes, komplett von anderen Firmen getrenntes Konto an.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemEmailSettings_pkey" PRIMARY KEY ("id")
);
