-- Tags (Verschlagwortung) mit optionalen Gruppen. Implizite m:n-Tabellen
-- (Spalte A = alphabetisch erstes Modell, B = zweites) fuer Kunden, Anfragen,
-- Termine, Angebote, Auftraege, Rechnungen und Aufgaben. Nur additive
-- Aenderungen, daher kein Backfill noetig.

CREATE TABLE "TagGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "groupId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TagGroup_companyId_idx" ON "TagGroup"("companyId");
CREATE UNIQUE INDEX "TagGroup_companyId_name_key" ON "TagGroup"("companyId", "name");
CREATE INDEX "Tag_companyId_idx" ON "Tag"("companyId");
CREATE UNIQUE INDEX "Tag_companyId_name_key" ON "Tag"("companyId", "name");

ALTER TABLE "TagGroup" ADD CONSTRAINT "TagGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TagGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "_CustomerToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_CustomerToTag_AB_unique" ON "_CustomerToTag"("A", "B");
CREATE INDEX "_CustomerToTag_B_index" ON "_CustomerToTag"("B");
ALTER TABLE "_CustomerToTag" ADD CONSTRAINT "_CustomerToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CustomerToTag" ADD CONSTRAINT "_CustomerToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_InquiryToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_InquiryToTag_AB_unique" ON "_InquiryToTag"("A", "B");
CREATE INDEX "_InquiryToTag_B_index" ON "_InquiryToTag"("B");
ALTER TABLE "_InquiryToTag" ADD CONSTRAINT "_InquiryToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InquiryToTag" ADD CONSTRAINT "_InquiryToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_AppointmentToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_AppointmentToTag_AB_unique" ON "_AppointmentToTag"("A", "B");
CREATE INDEX "_AppointmentToTag_B_index" ON "_AppointmentToTag"("B");
ALTER TABLE "_AppointmentToTag" ADD CONSTRAINT "_AppointmentToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AppointmentToTag" ADD CONSTRAINT "_AppointmentToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_QuoteToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_QuoteToTag_AB_unique" ON "_QuoteToTag"("A", "B");
CREATE INDEX "_QuoteToTag_B_index" ON "_QuoteToTag"("B");
ALTER TABLE "_QuoteToTag" ADD CONSTRAINT "_QuoteToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_QuoteToTag" ADD CONSTRAINT "_QuoteToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_ProjectToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_ProjectToTag_AB_unique" ON "_ProjectToTag"("A", "B");
CREATE INDEX "_ProjectToTag_B_index" ON "_ProjectToTag"("B");
ALTER TABLE "_ProjectToTag" ADD CONSTRAINT "_ProjectToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ProjectToTag" ADD CONSTRAINT "_ProjectToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_InvoiceToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_InvoiceToTag_AB_unique" ON "_InvoiceToTag"("A", "B");
CREATE INDEX "_InvoiceToTag_B_index" ON "_InvoiceToTag"("B");
ALTER TABLE "_InvoiceToTag" ADD CONSTRAINT "_InvoiceToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InvoiceToTag" ADD CONSTRAINT "_InvoiceToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_TagToTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_TagToTask_AB_unique" ON "_TagToTask"("A", "B");
CREATE INDEX "_TagToTask_B_index" ON "_TagToTask"("B");
ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
