-- One exercise aggregate per user per calendar day (`date` is normalized to local midnight in application code).
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_date_key" UNIQUE ("userId", "date");
