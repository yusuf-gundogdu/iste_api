-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('MISSING', 'IN_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PriceApproach" AS ENUM ('NEGOTIABLE', 'STARTING', 'FIXED');

-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('ON_SITE', 'WORKSHOP', 'BOTH');

-- CreateTable
CREATE TABLE "pro_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mainCategoryId" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "yearsExperience" INTEGER,
    "serviceMode" "ServiceMode" NOT NULL DEFAULT 'ON_SITE',
    "priceApproach" "PriceApproach" NOT NULL DEFAULT 'NEGOTIABLE',
    "priceAmount" DECIMAL(10,2),
    "city" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'MISSING',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pro_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pro_profile_sub_services" (
    "proProfileId" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,

    CONSTRAINT "pro_profile_sub_services_pkey" PRIMARY KEY ("proProfileId","subServiceId")
);

-- CreateTable
CREATE TABLE "pro_profile_brands" (
    "proProfileId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "pro_profile_brands_pkey" PRIMARY KEY ("proProfileId","brandId")
);

-- CreateTable
CREATE TABLE "pro_regions" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "pro_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "opensAt" TEXT NOT NULL DEFAULT '09:00',
    "closesAt" TEXT NOT NULL DEFAULT '18:00',

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pro_profiles_userId_key" ON "pro_profiles"("userId");

-- CreateIndex
CREATE INDEX "pro_profiles_mainCategoryId_idx" ON "pro_profiles"("mainCategoryId");

-- CreateIndex
CREATE INDEX "pro_regions_proProfileId_idx" ON "pro_regions"("proProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_proProfileId_dayOfWeek_key" ON "working_hours"("proProfileId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "pro_profiles" ADD CONSTRAINT "pro_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_profiles" ADD CONSTRAINT "pro_profiles_mainCategoryId_fkey" FOREIGN KEY ("mainCategoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_profile_sub_services" ADD CONSTRAINT "pro_profile_sub_services_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_profile_sub_services" ADD CONSTRAINT "pro_profile_sub_services_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_profile_brands" ADD CONSTRAINT "pro_profile_brands_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_profile_brands" ADD CONSTRAINT "pro_profile_brands_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_regions" ADD CONSTRAINT "pro_regions_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
