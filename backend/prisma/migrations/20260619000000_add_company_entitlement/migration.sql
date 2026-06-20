-- CreateTable
CREATE TABLE "company_entitlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "job_id" UUID,
    "type" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "invoice_id" UUID,

    CONSTRAINT "company_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_company_entitlements_company_job" ON "company_entitlements"("company_id", "job_id");

-- AddForeignKey
ALTER TABLE "company_entitlements" ADD CONSTRAINT "company_entitlements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_entitlements" ADD CONSTRAINT "company_entitlements_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
