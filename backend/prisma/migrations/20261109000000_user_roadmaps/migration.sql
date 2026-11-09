-- CreateTable
CREATE TABLE "user_roadmaps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "current_mode" TEXT NOT NULL,
    "current_score" INTEGER NOT NULL,
    "placement_result_id" INTEGER,
    "target_score" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "exam_date" DATE,
    "duration_weeks" INTEGER NOT NULL,
    "minutes_per_day" INTEGER NOT NULL,
    "days_per_week" INTEGER NOT NULL,
    "started_at" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roadmaps_user_id_key" ON "user_roadmaps"("user_id");

-- AddForeignKey
ALTER TABLE "user_roadmaps" ADD CONSTRAINT "user_roadmaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
