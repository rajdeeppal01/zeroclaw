-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "cn" TEXT NOT NULL,
    "reputation" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_quarantined" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analyst" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analyst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Threat" (
    "id" SERIAL NOT NULL,
    "stix_id" TEXT NOT NULL,
    "client_id" INTEGER NOT NULL,
    "stix_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" INTEGER,

    CONSTRAINT "Threat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_cn_key" ON "Client"("cn");

-- CreateIndex
CREATE UNIQUE INDEX "Analyst_username_key" ON "Analyst"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Threat_stix_id_key" ON "Threat"("stix_id");

-- AddForeignKey
ALTER TABLE "Threat" ADD CONSTRAINT "Threat_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Threat" ADD CONSTRAINT "Threat_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "Analyst"("id") ON DELETE SET NULL ON UPDATE CASCADE;
