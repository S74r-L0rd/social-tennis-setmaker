ALTER TABLE "Session"
ADD COLUMN "isBroadcasting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "selectedBroadcastRoundNumber" INTEGER;
