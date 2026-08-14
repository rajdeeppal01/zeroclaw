-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "quarantine_reset_at" TIMESTAMP(3),
ADD COLUMN     "unquarantined_by_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_unquarantined_by_id_fkey" FOREIGN KEY ("unquarantined_by_id") REFERENCES "Analyst"("id") ON DELETE SET NULL ON UPDATE CASCADE;
