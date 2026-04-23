-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'RESTING', 'INACTIVE');

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3),
    "sessionPeriod" TEXT,
    "startDateTime" TIMESTAMP(3),
    "matchDurationMinutes" INTEGER,
    "breakIntervalMinutes" INTEGER,
    "courtCount" INTEGER,
    "gameMode" TEXT,
    "ratingMode" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionPlayer" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "plannedRounds" INTEGER NOT NULL DEFAULT 0,
    "roundsPlayed" INTEGER NOT NULL DEFAULT 0,
    "sitOutCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "SessionPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCourt" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "courtNumber" INTEGER NOT NULL,
    "courtName" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "priorityOrder" INTEGER,

    CONSTRAINT "SessionCourt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "courtNumber" INTEGER,
    "courtName" TEXT,
    "matchOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchAssignment" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "positionInTeam" INTEGER NOT NULL,

    CONSTRAINT "MatchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundSitOut" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "sessionPlayerId" INTEGER NOT NULL,

    CONSTRAINT "RoundSitOut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionPlayer_sessionId_playerId_key" ON "SessionPlayer"("sessionId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionCourt_sessionId_courtNumber_key" ON "SessionCourt"("sessionId", "courtNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Round_sessionId_roundNumber_key" ON "Round"("sessionId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAssignment_matchId_playerId_key" ON "MatchAssignment"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAssignment_matchId_teamNumber_positionInTeam_key" ON "MatchAssignment"("matchId", "teamNumber", "positionInTeam");

-- CreateIndex
CREATE UNIQUE INDEX "RoundSitOut_roundId_sessionPlayerId_key" ON "RoundSitOut"("roundId", "sessionPlayerId");

-- AddForeignKey
ALTER TABLE "SessionPlayer" ADD CONSTRAINT "SessionPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPlayer" ADD CONSTRAINT "SessionPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCourt" ADD CONSTRAINT "SessionCourt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAssignment" ADD CONSTRAINT "MatchAssignment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAssignment" ADD CONSTRAINT "MatchAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundSitOut" ADD CONSTRAINT "RoundSitOut_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundSitOut" ADD CONSTRAINT "RoundSitOut_sessionPlayerId_fkey" FOREIGN KEY ("sessionPlayerId") REFERENCES "SessionPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
