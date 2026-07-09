-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Food" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "sourceCount" INTEGER NOT NULL DEFAULT 1,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "fiber" REAL NOT NULL,
    "calories" REAL NOT NULL
);
INSERT INTO "new_Food" ("calories", "carbs", "category", "fat", "fiber", "id", "name", "protein", "searchText", "sourceCount", "state") SELECT "calories", "carbs", "category", "fat", "fiber", "id", "name", "protein", "searchText", "sourceCount", "state" FROM "Food";
DROP TABLE "Food";
ALTER TABLE "new_Food" RENAME TO "Food";
CREATE INDEX "Food_searchText_idx" ON "Food"("searchText");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
