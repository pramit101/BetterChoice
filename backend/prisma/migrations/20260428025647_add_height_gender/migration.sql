-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "height" DOUBLE PRECISION,
ALTER COLUMN "weight" DROP NOT NULL;
