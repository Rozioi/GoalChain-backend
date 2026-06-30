-- CreateEnum
CREATE TYPE "Position" AS ENUM ('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF');

-- CreateEnum
CREATE TYPE "PlayerStyle" AS ENUM ('SPEEDY', 'POWERFUL', 'TECHNICAL', 'ATTACKING', 'DEFENSIVE', 'POSITIONAL');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DraftStep" AS ENUM ('GK', 'DEF', 'MID', 'FWD', 'RESERVE', 'DONE');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('FRIENDLY', 'CHALLENGE', 'SEASON', 'EVENT');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MatchInviteType" AS ENUM ('FRIEND', 'OPEN');

-- CreateEnum
CREATE TYPE "MatchInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MatchmakingStatus" AS ENUM ('SEARCHING', 'MATCHED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PressingType" AS ENUM ('SOFT', 'MEDIUM', 'INTENSIVE');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'PLAYOFFS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WORLD_CUP', 'EURO', 'COPA_AMERICA', 'CHAMPIONS_LEAGUE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'DRAFT_PHASE', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ScoutStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'COLLECTED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SEASON', 'DAILY', 'INTRO');

-- CreateEnum
CREATE TYPE "TaskObjective" AS ENUM ('GOALS', 'WINS', 'MATCHES', 'CLEAN_SHEETS', 'REFERRALS', 'SOCIAL_JOIN', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RentStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "EconomySource" AS ENUM ('RENTAL_FEE', 'MATCH_REWARD', 'TASK_REWARD', 'SCOUTING_COST', 'TRAINING_COST', 'REFERRAL_REWARD', 'ADMIN_ADJUSTMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "clubName" TEXT,
    "clubIcon" TEXT,
    "photoUrl" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 1000,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "scoutingLevel" INTEGER NOT NULL DEFAULT 1,
    "scoutingExp" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "dailyMatchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "dailyMatchesResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "energy" INTEGER NOT NULL DEFAULT 10,
    "energyUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "reward" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT DEFAULT '',
    "overallRating" INTEGER NOT NULL DEFAULT 50,
    "position" "Position" NOT NULL,
    "role" "PlayerRole" NOT NULL,
    "style" "PlayerStyle" NOT NULL,
    "pace" INTEGER NOT NULL DEFAULT 50,
    "paceBonus" INTEGER NOT NULL DEFAULT 0,
    "shooting" INTEGER NOT NULL DEFAULT 50,
    "shootingBonus" INTEGER NOT NULL DEFAULT 0,
    "passing" INTEGER NOT NULL DEFAULT 50,
    "passingBonus" INTEGER NOT NULL DEFAULT 0,
    "dribbling" INTEGER NOT NULL DEFAULT 50,
    "dribblingBonus" INTEGER NOT NULL DEFAULT 0,
    "defending" INTEGER NOT NULL DEFAULT 50,
    "defendingBonus" INTEGER NOT NULL DEFAULT 0,
    "physical" INTEGER NOT NULL DEFAULT 50,
    "physicalBonus" INTEGER NOT NULL DEFAULT 0,
    "goalkeeping" INTEGER NOT NULL DEFAULT 50,
    "formValue" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "fatigue" INTEGER NOT NULL DEFAULT 0,
    "country" TEXT NOT NULL DEFAULT 'RU',
    "potentialMin" INTEGER NOT NULL DEFAULT 80,
    "potentialMax" INTEGER NOT NULL DEFAULT 90,
    "heightCm" INTEGER NOT NULL DEFAULT 180,
    "weightKg" INTEGER NOT NULL DEFAULT 75,
    "foot" TEXT NOT NULL DEFAULT 'Right',
    "skillMoves" INTEGER NOT NULL DEFAULT 3,
    "weakFoot" INTEGER NOT NULL DEFAULT 3,
    "injuryType" TEXT,
    "injuryEndsAt" TIMESTAMP(3),
    "isNft" BOOLEAN NOT NULL DEFAULT false,
    "mintedAt" TIMESTAMP(3),
    "tokenId" TEXT,
    "nftAddress" TEXT,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "mintingStatus" TEXT NOT NULL DEFAULT 'none',
    "lockedAt" TIMESTAMP(3),
    "age" INTEGER NOT NULL DEFAULT 22,
    "nationality" TEXT NOT NULL DEFAULT 'Unknown',
    "clubId" INTEGER DEFAULT 0,
    "club" TEXT NOT NULL DEFAULT 'Free Agent',
    "leagueId" INTEGER DEFAULT 0,
    "leagueDivisionId" INTEGER DEFAULT 0,
    "trainingLevel" INTEGER NOT NULL DEFAULT 1,
    "trainingLevelMax" INTEGER NOT NULL DEFAULT 25,
    "trainingExperience" INTEGER NOT NULL DEFAULT 0,
    "trainingExperienceRequired" INTEGER NOT NULL DEFAULT 200,
    "face" TEXT DEFAULT 'face_1',
    "hairStyle" TEXT DEFAULT 'short',
    "hairColor" TEXT DEFAULT 'black',
    "skinColor" TEXT DEFAULT 'light',
    "beardStyle" TEXT DEFAULT 'none',
    "beardColor" TEXT DEFAULT 'none',
    "emotion" TEXT DEFAULT 'neutral',
    "rarity" TEXT DEFAULT 'common',
    "imageUrl" TEXT,
    "ownerId" TEXT,
    "isOnRent" BOOLEAN NOT NULL DEFAULT false,
    "rentPrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "formation" TEXT NOT NULL DEFAULT '4-4-2',
    "userId" TEXT NOT NULL,
    "isEvent" BOOLEAN NOT NULL DEFAULT false,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPlayer" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "positionInFormation" TEXT,

    CONSTRAINT "TeamPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "step" "DraftStep" NOT NULL DEFAULT 'GK',
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftOption" (
    "id" TEXT NOT NULL,
    "draftSessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "step" "DraftStep" NOT NULL,
    "isPicked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DraftOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "type" "MatchType" NOT NULL DEFAULT 'FRIENDLY',
    "status" "MatchStatus" NOT NULL DEFAULT 'READY',
    "homeUserId" TEXT,
    "awayUserId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "seed" TEXT,
    "overtime" BOOLEAN NOT NULL DEFAULT false,
    "homePressingType" "PressingType" NOT NULL DEFAULT 'MEDIUM',
    "awayPressingType" "PressingType" NOT NULL DEFAULT 'MEDIUM',
    "homeCoins" INTEGER NOT NULL DEFAULT 0,
    "awayCoins" INTEGER NOT NULL DEFAULT 0,
    "homeExp" INTEGER NOT NULL DEFAULT 0,
    "awayExp" INTEGER NOT NULL DEFAULT 0,
    "currentMinute" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "homeReady" BOOLEAN NOT NULL DEFAULT false,
    "awayReady" BOOLEAN NOT NULL DEFAULT false,
    "inviteId" TEXT,
    "seasonId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchInvite" (
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

-- CreateTable
CREATE TABLE "MatchmakingQueue" (
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

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "playerId" TEXT,
    "playerName" TEXT,
    "playerOutId" TEXT,
    "playerOutName" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division" INTEGER NOT NULL DEFAULT 1,
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonStanding" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeasonStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDraft" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "step" "DraftStep" NOT NULL DEFAULT 'GK',
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "ageMin" INTEGER NOT NULL DEFAULT 16,
    "ageMax" INTEGER NOT NULL DEFAULT 35,
    "targetRole" "PlayerRole",
    "status" "ScoutStatus" NOT NULL DEFAULT 'ACTIVE',
    "endsAt" TIMESTAMP(3) NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'COMMON',
    "cost" INTEGER NOT NULL DEFAULT 0,
    "costCurrency" TEXT NOT NULL DEFAULT 'COIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutResult" (
    "id" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL,
    "objective" "TaskObjective" NOT NULL DEFAULT 'MATCHES',
    "reward" INTEGER NOT NULL,
    "goal" INTEGER NOT NULL,
    "icon" TEXT,
    "link" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "stat" TEXT NOT NULL,
    "boost" INTEGER NOT NULL DEFAULT 1,
    "cost" INTEGER NOT NULL,
    "status" "TrainingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "MatchStreak_userId_key" ON "MatchStreak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_inviterId_inviteeId_key" ON "Referral"("inviterId", "inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRent_playerId_key" ON "PlayerRent"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamPlayer_teamId_playerId_key" ON "TeamPlayer"("teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_inviteId_key" ON "Match"("inviteId");

-- CreateIndex
CREATE INDEX "Match_status_type_idx" ON "Match"("status", "type");

-- CreateIndex
CREATE INDEX "Match_homeUserId_status_idx" ON "Match"("homeUserId", "status");

-- CreateIndex
CREATE INDEX "Match_awayUserId_status_idx" ON "Match"("awayUserId", "status");

-- CreateIndex
CREATE INDEX "MatchInvite_senderId_recipientId_status_idx" ON "MatchInvite"("senderId", "recipientId", "status");

-- CreateIndex
CREATE INDEX "MatchInvite_status_expiresAt_idx" ON "MatchInvite"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "MatchInvite_type_status_idx" ON "MatchInvite"("type", "status");

-- CreateIndex
CREATE INDEX "MatchmakingQueue_status_pointsSnapshot_idx" ON "MatchmakingQueue"("status", "pointsSnapshot");

-- CreateIndex
CREATE INDEX "MatchmakingQueue_userId_status_idx" ON "MatchmakingQueue"("userId", "status");

-- CreateIndex
CREATE INDEX "MatchmakingQueue_status_expiresAt_idx" ON "MatchmakingQueue"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE INDEX "SeasonStanding_seasonId_points_goalsFor_idx" ON "SeasonStanding"("seasonId", "points" DESC, "goalsFor" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonStanding_seasonId_teamId_key" ON "SeasonStanding"("seasonId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTask_userId_taskId_key" ON "UserTask"("userId", "taskId");

-- CreateIndex
CREATE INDEX "RentContract_status_endDate_idx" ON "RentContract"("status", "endDate");

-- CreateIndex
CREATE INDEX "EconomyLog_userId_createdAt_idx" ON "EconomyLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EconomyLog_source_createdAt_idx" ON "EconomyLog"("source", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchStreak" ADD CONSTRAINT "MatchStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRent" ADD CONSTRAINT "PlayerRent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlayer" ADD CONSTRAINT "TeamPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlayer" ADD CONSTRAINT "TeamPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSession" ADD CONSTRAINT "DraftSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftOption" ADD CONSTRAINT "DraftOption_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "DraftSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftOption" ADD CONSTRAINT "DraftOption_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "MatchInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeUserId_fkey" FOREIGN KEY ("homeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayUserId_fkey" FOREIGN KEY ("awayUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchInvite" ADD CONSTRAINT "MatchInvite_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchInvite" ADD CONSTRAINT "MatchInvite_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchmakingQueue" ADD CONSTRAINT "MatchmakingQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "ScoutResult" ADD CONSTRAINT "ScoutResult_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
