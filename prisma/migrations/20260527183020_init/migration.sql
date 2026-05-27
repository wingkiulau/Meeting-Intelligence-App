-- CreateTable
CREATE TABLE "Summary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "meetingType" TEXT NOT NULL,
    "rawInput" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actionItems" TEXT NOT NULL,
    "riskFlags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
