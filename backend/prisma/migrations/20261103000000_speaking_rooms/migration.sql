-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "english_level" TEXT DEFAULT 'B1',
ADD COLUMN     "total_speaking_seconds" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "speaking_rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "host_user_id" UUID NOT NULL,
    "english_level" TEXT NOT NULL,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "passcode" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "speaking_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speaking_room_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "is_speaking" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "speaking_room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speaking_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "room_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "speaking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_speaking_rooms_status_visibility" ON "speaking_rooms"("status", "visibility");

-- CreateIndex
CREATE INDEX "idx_speaking_rooms_level" ON "speaking_rooms"("english_level");

-- CreateIndex
CREATE INDEX "idx_speaking_rooms_host" ON "speaking_rooms"("host_user_id");

-- CreateIndex
CREATE INDEX "idx_speaking_room_members_room" ON "speaking_room_members"("room_id");

-- CreateIndex
CREATE INDEX "idx_speaking_room_members_user" ON "speaking_room_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_speaking_room_user" ON "speaking_room_members"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_speaking_sessions_user" ON "speaking_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "speaking_rooms" ADD CONSTRAINT "speaking_rooms_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_room_members" ADD CONSTRAINT "speaking_room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "speaking_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_room_members" ADD CONSTRAINT "speaking_room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_sessions" ADD CONSTRAINT "speaking_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_sessions" ADD CONSTRAINT "speaking_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "speaking_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Ràng buộc giá trị giống migration Supabase cũ (20261023_speaking_rooms.sql)
ALTER TABLE "speaking_rooms" ADD CONSTRAINT "speaking_rooms_english_level_check" CHECK ("english_level" IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
ALTER TABLE "speaking_rooms" ADD CONSTRAINT "speaking_rooms_visibility_check" CHECK ("visibility" IN ('public', 'private'));
ALTER TABLE "speaking_rooms" ADD CONSTRAINT "speaking_rooms_capacity_check" CHECK ("capacity" >= 2 AND "capacity" <= 5);
ALTER TABLE "speaking_rooms" ADD CONSTRAINT "speaking_rooms_status_check" CHECK ("status" IN ('active', 'closed', 'expired'));
ALTER TABLE "speaking_room_members" ADD CONSTRAINT "speaking_room_members_role_check" CHECK ("role" IN ('host', 'member'));
