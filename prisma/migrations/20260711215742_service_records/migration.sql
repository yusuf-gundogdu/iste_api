-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DISCUSSING', 'PAYMENT_PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "service_records" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'DISCUSSING',
    "title" TEXT,
    "agreedAmount" DECIMAL(10,2),
    "scheduledAt" TIMESTAMP(3),
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_records_conversationId_key" ON "service_records"("conversationId");

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
