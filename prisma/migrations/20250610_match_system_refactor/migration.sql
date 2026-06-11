-- Migration: Match system refactor
-- Run: psql $DATABASE_URL -f prisma/migrations/20250610_match_system_refactor/migration.sql

-- New enums
DO $$ BEGIN
  CREATE TYPE "MatchInviteType" AS ENUM ('FRIEND', 'OPEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MatchInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MatchmakingStatus" AS ENUM ('SEARCHING', 'MATCHED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend MatchStatus (add new values; old PENDING rows migrated separately)
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'ABANDONED';

-- MatchInvite table
CREATE TABLE IF NOT EXISTS "MatchInvite" (
  "id" TEXT NOT NULL,
  "type" "MatchInviteType" NOT NULL,
  "status" "MatchInviteStatus" NOT NULL DEFAULT 'PENDING',
  "senderId" TEXT NOT NULL,
  "recipientId" TEXT,
  "senderTeamId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MatchInvite_senderId_recipientId_status_idx"
  ON "MatchInvite"("senderId", "recipientId", "status");
CREATE INDEX IF NOT EXISTS "MatchInvite_status_expiresAt_idx"
  ON "MatchInvite"("status", "expiresAt");

ALTER TABLE "MatchInvite"
  ADD CONSTRAINT "MatchInvite_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchInvite"
  ADD CONSTRAINT "MatchInvite_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MatchmakingQueue table
CREATE TABLE IF NOT EXISTS "MatchmakingQueue" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "pointsSnapshot" INTEGER NOT NULL,
  "status" "MatchmakingStatus" NOT NULL DEFAULT 'SEARCHING',
  "matchId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchmakingQueue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MatchmakingQueue_status_pointsSnapshot_idx"
  ON "MatchmakingQueue"("status", "pointsSnapshot");
CREATE INDEX IF NOT EXISTS "MatchmakingQueue_userId_status_idx"
  ON "MatchmakingQueue"("userId", "status");

ALTER TABLE "MatchmakingQueue"
  ADD CONSTRAINT "MatchmakingQueue_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match new columns
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "currentMinute" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP(3);
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "homeReady" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "awayReady" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "inviteId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Match_inviteId_key" ON "Match"("inviteId");

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_inviteId_fkey"
  FOREIGN KEY ("inviteId") REFERENCES "MatchInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Match_status_type_idx" ON "Match"("status", "type");

-- Migrate legacy PENDING matches to invites (data step — run migrate-match-system.ts for full logic)
-- UPDATE "Match" SET status = 'COMPLETED' WHERE status = 'PENDING' AND "homeScore" IS NOT NULL;
