/*
  Warnings:

  - You are about to drop the `IdentityCommitment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Nullifier` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "IdentityCommitment" DROP CONSTRAINT "IdentityCommitment_client_id_fkey";

-- DropTable
DROP TABLE "IdentityCommitment";

-- DropTable
DROP TABLE "Nullifier";

-- CreateIndex
CREATE INDEX "Threat_client_id_created_at_idx" ON "Threat"("client_id", "created_at");
