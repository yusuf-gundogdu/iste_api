-- AlterTable
ALTER TABLE "pro_profiles" ADD COLUMN     "maxDistanceKm" INTEGER,
ADD COLUMN     "priceNote" TEXT;

-- AlterTable
ALTER TABLE "pro_regions" ADD COLUMN     "approxKm" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "pro_documents" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pro_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pro_services" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'Yerinde',
    "priceType" TEXT NOT NULL DEFAULT 'Fiyat konuşulur',
    "priceAmount" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pro_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pro_documents_proProfileId_docType_key" ON "pro_documents"("proProfileId", "docType");

-- CreateIndex
CREATE INDEX "pro_services_proProfileId_idx" ON "pro_services"("proProfileId");

-- AddForeignKey
ALTER TABLE "pro_documents" ADD CONSTRAINT "pro_documents_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_services" ADD CONSTRAINT "pro_services_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

