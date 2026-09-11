ALTER TABLE "Invoice" ADD COLUMN "quoteId" TEXT;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Invoice_quoteId_idx" ON "Invoice"("quoteId");
