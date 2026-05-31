DROP INDEX IF EXISTS "Repository_githubId_key";

CREATE UNIQUE INDEX "Repository_installationId_githubId_key" ON "Repository"("installationId", "githubId");
