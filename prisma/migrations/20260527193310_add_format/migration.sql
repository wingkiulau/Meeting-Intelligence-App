-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Summary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "meetingType" TEXT NOT NULL,
    "rawInput" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'detailed',
    "summary" TEXT NOT NULL,
    "actionItems" TEXT NOT NULL,
    "riskFlags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Summary" ("actionItems", "createdAt", "id", "meetingType", "rawInput", "riskFlags", "summary", "title") SELECT "actionItems", "createdAt", "id", "meetingType", "rawInput", "riskFlags", "summary", "title" FROM "Summary";
DROP TABLE "Summary";
ALTER TABLE "new_Summary" RENAME TO "Summary";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
