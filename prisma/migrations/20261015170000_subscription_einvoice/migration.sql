-- Merker fuer versendete E-Rechnungen zu bezahlten Stripe-Abo-Rechnungen.
CREATE TABLE "SubscriptionEInvoice" (
    "stripeInvoiceId" TEXT NOT NULL,
    "companyId" TEXT,
    "recipients" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEInvoice_pkey" PRIMARY KEY ("stripeInvoiceId")
);
