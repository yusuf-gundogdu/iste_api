-- AlterTable
ALTER TABLE "pro_profiles" ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payouts_proProfileId_createdAt_idx" ON "payouts"("proProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

