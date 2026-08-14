-- AlterTable
ALTER TABLE "Threat" ADD COLUMN "revoked_at" TIMESTAMP(3);
ALTER TABLE "Threat" ADD COLUMN "revoked_by_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Threat" ADD CONSTRAINT "Threat_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "Analyst"("id") ON DELETE SET NULL ON UPDATE CASCADE;
