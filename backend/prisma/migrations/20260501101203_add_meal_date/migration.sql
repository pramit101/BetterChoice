/*
  Warnings:

  - A unique constraint covering the columns `[name,calories]` on the table `FoodItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name,date]` on the table `Meal` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_name_calories_key" ON "FoodItem"("name", "calories");

-- CreateIndex
CREATE UNIQUE INDEX "Meal_userId_name_date_key" ON "Meal"("userId", "name", "date");
