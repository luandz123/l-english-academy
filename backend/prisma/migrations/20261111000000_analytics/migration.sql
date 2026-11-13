-- AlterTable
ALTER TABLE "practice_answers" ADD COLUMN     "time_seconds" INTEGER;

-- CreateTable
CREATE TABLE "roadmap_week_plans" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "focus" JSONB NOT NULL DEFAULT '[]',
    "tasks" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_week_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_recommendation_skips" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "test_id" INTEGER NOT NULL,
    "skipped_until" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exam_recommendation_skips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_week_plans_user_id_week_start_key" ON "roadmap_week_plans"("user_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "exam_recommendation_skips_user_id_test_id_key" ON "exam_recommendation_skips"("user_id", "test_id");

-- AddForeignKey
ALTER TABLE "roadmap_week_plans" ADD CONSTRAINT "roadmap_week_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_recommendation_skips" ADD CONSTRAINT "exam_recommendation_skips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

