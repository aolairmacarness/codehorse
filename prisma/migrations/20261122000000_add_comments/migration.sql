-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "githubId" BIGINT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_pullRequestId_createdAt_idx" ON "comment"("pullRequestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "comment_pullRequestId_githubId_key" ON "comment"("pullRequestId", "githubId");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
