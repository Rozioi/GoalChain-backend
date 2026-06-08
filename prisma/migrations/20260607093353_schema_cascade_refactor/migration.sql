/*
  Warnings:

  - You are about to drop the column `form` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `ovr` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `potential` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `synergyBonus` on the `Player` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserTask` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskObjective" AS ENUM ('GOALS', 'WINS', 'MATCHES', 'CLEAN_SHEETS', 'REFERRALS', 'SOCIAL_JOIN', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "RentStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "EconomySource" AS ENUM ('RENTAL_FEE', 'MATCH_REWARD', 'TASK_REWARD', 'SCOUTING_COST', 'TRAINING_COST', 'REFERRAL_REWARD', 'ADMIN_ADJUSTMENT');

-- AlterEnum
ALTER TYPE "MatchType" ADD VALUE 'CHALLENGE';

-- DropForeignKey
ALTER TABLE "DraftOption" DROP CONSTRAINT "DraftOption_playerId_fkey";

-- DropForeignKey
ALTER TABLE "DraftSession" DROP CONSTRAINT "DraftSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "EventDraft" DROP CONSTRAINT "EventDraft_eventId_fkey";

-- DropForeignKey
ALTER TABLE "EventDraft" DROP CONSTRAINT "EventDraft_userId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_awayTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_homeTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_inviteeId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "Scout" DROP CONSTRAINT "Scout_userId_fkey";

-- DropForeignKey
ALTER TABLE "ScoutResult" DROP CONSTRAINT "ScoutResult_playerId_fkey";

-- DropForeignKey
ALTER TABLE "SeasonStanding" DROP CONSTRAINT "SeasonStanding_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "SeasonStanding" DROP CONSTRAINT "SeasonStanding_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeamPlayer" DROP CONSTRAINT "TeamPlayer_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Training" DROP CONSTRAINT "Training_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Training" DROP CONSTRAINT "Training_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserTask" DROP CONSTRAINT "UserTask_taskId_fkey";

-- DropForeignKey
ALTER TABLE "UserTask" DROP CONSTRAINT "UserTask_userId_fkey";

-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "awayTeamId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "playerOutId" TEXT,
ADD COLUMN     "playerOutName" TEXT;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "form",
DROP COLUMN "ovr",
DROP COLUMN "potential",
DROP COLUMN "synergyBonus",
ADD COLUMN     "beardColor" TEXT DEFAULT 'none',
ADD COLUMN     "beardStyle" TEXT DEFAULT 'none',
ADD COLUMN     "clubId" INTEGER DEFAULT 0,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'RU',
ADD COLUMN     "defendingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dribblingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emotion" TEXT DEFAULT 'neutral',
ADD COLUMN     "face" TEXT DEFAULT 'face_1',
ADD COLUMN     "foot" TEXT NOT NULL DEFAULT 'Right',
ADD COLUMN     "formValue" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "hairColor" TEXT DEFAULT 'black',
ADD COLUMN     "hairStyle" TEXT DEFAULT 'short',
ADD COLUMN     "heightCm" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "injuryEndsAt" TIMESTAMP(3),
ADD COLUMN     "injuryType" TEXT,
ADD COLUMN     "isOnRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leagueDivisionId" INTEGER DEFAULT 0,
ADD COLUMN     "leagueId" INTEGER DEFAULT 0,
ADD COLUMN     "mintedAt" TIMESTAMP(3),
ADD COLUMN     "overallRating" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "paceBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "physicalBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "potentialMax" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "potentialMin" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "rarity" TEXT DEFAULT 'common',
ADD COLUMN     "rentPrice" INTEGER,
ADD COLUMN     "shootingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skillMoves" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "skinColor" TEXT DEFAULT 'light',
ADD COLUMN     "surname" TEXT DEFAULT '',
ADD COLUMN     "tokenId" TEXT,
ADD COLUMN     "trainingExperience" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trainingExperienceRequired" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "trainingLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "trainingLevelMax" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "weakFoot" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "weightKg" INTEGER NOT NULL DEFAULT 75;

-- AlterTable
ALTER TABLE "Scout" ADD COLUMN     "cost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "costCurrency" TEXT NOT NULL DEFAULT 'COIN',
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'COMMON';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "link" TEXT,
ADD COLUMN     "objective" "TaskObjective" NOT NULL DEFAULT 'MATCHES';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "experience" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoutingExp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoutingLevel" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "UserTask" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "PlayerRent" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isRented" BOOLEAN NOT NULL DEFAULT false,
    "rentedById" TEXT,
    "priceTon" DOUBLE PRECISION DEFAULT 0,
    "priceCoin" INTEGER DEFAULT 0,
    "durationOptions" JSONB,
    "conditions" JSONB,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentContract" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "lessorId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "RentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COIN',
    "source" "EconomySource" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRent_playerId_key" ON "PlayerRent"("playerId");

-- CreateIndex
CREATE INDEX "RentContract_status_endDate_idx" ON "RentContract"("status", "endDate");

-- CreateIndex
CREATE INDEX "EconomyLog_userId_createdAt_idx" ON "EconomyLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EconomyLog_source_createdAt_idx" ON "EconomyLog"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE INDEX "SeasonStanding_seasonId_points_goalsFor_idx" ON "SeasonStanding"("seasonId", "points" DESC, "goalsFor" DESC);

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRent" ADD CONSTRAINT "PlayerRent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlayer" ADD CONSTRAINT "TeamPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSession" ADD CONSTRAINT "DraftSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftOption" ADD CONSTRAINT "DraftOption_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonStanding" ADD CONSTRAINT "SeasonStanding_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonStanding" ADD CONSTRAINT "SeasonStanding_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDraft" ADD CONSTRAINT "EventDraft_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDraft" ADD CONSTRAINT "EventDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scout" ADD CONSTRAINT "Scout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutResult" ADD CONSTRAINT "ScoutResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTask" ADD CONSTRAINT "UserTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTask" ADD CONSTRAINT "UserTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentContract" ADD CONSTRAINT "RentContract_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentContract" ADD CONSTRAINT "RentContract_lessorId_fkey" FOREIGN KEY ("lessorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentContract" ADD CONSTRAINT "RentContract_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomyLog" ADD CONSTRAINT "EconomyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
