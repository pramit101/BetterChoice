/*
  Warnings:

  - You are about to drop the column `imageUri` on the `Meal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN     "imageUri" TEXT;

-- AlterTable
ALTER TABLE "Meal" DROP COLUMN "imageUri";
