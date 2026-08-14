-- CreateTable
CREATE TABLE "IdentityCommitment" (
    "id" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "client_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nullifier" (
    "id" TEXT NOT NULL,
    "nullifier" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nullifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityCommitment_commitment_key" ON "IdentityCommitment"("commitment");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityCommitment_client_id_key" ON "IdentityCommitment"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "Nullifier_nullifier_key" ON "Nullifier"("nullifier");

-- AddForeignKey
ALTER TABLE "IdentityCommitment" ADD CONSTRAINT "IdentityCommitment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
