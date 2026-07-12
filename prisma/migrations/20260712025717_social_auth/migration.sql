-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'APPLE');

-- DropIndex
DROP INDEX "users_phone_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "provider" "AuthProvider" NOT NULL,
ADD COLUMN     "providerSub" TEXT NOT NULL;

-- DropTable
DROP TABLE "otp_codes";

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_providerSub_key" ON "users"("provider", "providerSub");

