import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "wa-log.txt");

export function readLog(): string {
  if (!fs.existsSync(LOG_PATH)) return "";
  return fs.readFileSync(LOG_PATH, "utf-8");
}

export function appendEntry(entry: string): string {
  const current = readLog();
  const trimmed = current.trimEnd();
  const updated = trimmed.length > 0 ? `${trimmed}\n${entry}` : entry;
  fs.writeFileSync(LOG_PATH, updated, "utf-8");
  return updated;
}
