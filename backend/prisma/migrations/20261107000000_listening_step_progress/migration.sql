-- CreateTable
CREATE TABLE "user_listening_step_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cluster_id" TEXT NOT NULL,
    "completed_steps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_listening_step_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_listening_step_progress_user_id_cluster_id_key" ON "user_listening_step_progress"("user_id", "cluster_id");

-- AddForeignKey
ALTER TABLE "user_listening_step_progress" ADD CONSTRAINT "user_listening_step_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

