-- Rename the domain models. RENAME preserves every row; this is deliberately
-- hand-written because Prisma cannot tell a rename from a drop-and-create and
-- would have generated the destructive version.

ALTER TABLE "Goal"           RENAME TO "Target";
ALTER TABLE "FoodEntry"      RENAME TO "DietEntry";
ALTER TABLE "NutrientAmount" RENAME TO "DietNutrient";
ALTER TABLE "WeightLog"      RENAME TO "WeighIn";

-- targetWeightKg stuttered against its new model name
ALTER TABLE "Target" RENAME COLUMN "targetWeightKg" TO "weightKg";

-- primary keys
ALTER INDEX "Goal_pkey"           RENAME TO "Target_pkey";
ALTER INDEX "FoodEntry_pkey"      RENAME TO "DietEntry_pkey";
ALTER INDEX "NutrientAmount_pkey" RENAME TO "DietNutrient_pkey";
ALTER INDEX "WeightLog_pkey"      RENAME TO "WeighIn_pkey";

-- secondary and unique indexes
ALTER INDEX "Goal_userId_effectiveFrom_idx"       RENAME TO "Target_userId_effectiveFrom_idx";
ALTER INDEX "FoodEntry_userId_consumedOn_idx"     RENAME TO "DietEntry_userId_consumedOn_idx";
ALTER INDEX "FoodEntry_userId_mealType_idx"       RENAME TO "DietEntry_userId_mealType_idx";
ALTER INDEX "NutrientAmount_nutrient_idx"         RENAME TO "DietNutrient_nutrient_idx";
ALTER INDEX "NutrientAmount_entryId_nutrient_key" RENAME TO "DietNutrient_entryId_nutrient_key";
ALTER INDEX "WeightLog_userId_loggedOn_idx"       RENAME TO "WeighIn_userId_loggedOn_idx";
ALTER INDEX "WeightLog_userId_loggedOn_key"       RENAME TO "WeighIn_userId_loggedOn_key";

-- foreign keys
ALTER TABLE "Target"       RENAME CONSTRAINT "Goal_userId_fkey"           TO "Target_userId_fkey";
ALTER TABLE "DietEntry"    RENAME CONSTRAINT "FoodEntry_userId_fkey"      TO "DietEntry_userId_fkey";
ALTER TABLE "DietNutrient" RENAME CONSTRAINT "NutrientAmount_entryId_fkey" TO "DietNutrient_entryId_fkey";
ALTER TABLE "WeighIn"      RENAME CONSTRAINT "WeightLog_userId_fkey"      TO "WeighIn_userId_fkey";
