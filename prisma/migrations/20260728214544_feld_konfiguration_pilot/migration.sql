-- CreateTable
CREATE TABLE "FieldConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "formKey" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldConfig_companyId_formKey_fieldKey_key" ON "FieldConfig"("companyId", "formKey", "fieldKey");

-- AddForeignKey
ALTER TABLE "FieldConfig" ADD CONSTRAINT "FieldConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
