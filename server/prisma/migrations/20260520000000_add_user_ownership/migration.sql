-- Add organiser ownership to sessions and players.
-- Existing rows are backfilled to the first user where possible so local/dev
-- data remains accessible after the ownership filters are introduced.

ALTER TABLE "Session" ADD COLUMN "createdById" INTEGER;
ALTER TABLE "Player" ADD COLUMN "createdById" INTEGER;

UPDATE "Session"
SET "createdById" = (SELECT "id" FROM "User" ORDER BY "id" ASC LIMIT 1)
WHERE "createdById" IS NULL;

UPDATE "Player"
SET "createdById" = (SELECT "id" FROM "User" ORDER BY "id" ASC LIMIT 1)
WHERE "createdById" IS NULL;

CREATE INDEX "Session_createdById_idx" ON "Session"("createdById");
CREATE INDEX "Player_createdById_idx" ON "Player"("createdById");

ALTER TABLE "Session"
ADD CONSTRAINT "Session_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Player"
ADD CONSTRAINT "Player_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
