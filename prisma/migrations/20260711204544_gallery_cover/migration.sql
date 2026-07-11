-- AlterTable
ALTER TABLE "pro_profiles" ADD COLUMN     "coverUrl" TEXT;

-- CreateTable
CREATE TABLE "pro_gallery_images" (
    "id" TEXT NOT NULL,
    "proProfileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pro_gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pro_gallery_images_proProfileId_idx" ON "pro_gallery_images"("proProfileId");

-- AddForeignKey
ALTER TABLE "pro_gallery_images" ADD CONSTRAINT "pro_gallery_images_proProfileId_fkey" FOREIGN KEY ("proProfileId") REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
