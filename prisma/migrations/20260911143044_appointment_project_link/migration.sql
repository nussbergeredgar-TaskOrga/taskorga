ALTER TABLE "Appointment" ADD COLUMN "projectId" TEXT;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Appointment_projectId_idx" ON "Appointment"("projectId");
