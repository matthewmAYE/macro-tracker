import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExistsSync = vi.fn();

vi.mock("fs", () => ({
  default: {
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync,
  },
}));

vi.mock("path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function getModule() {
  return import("./log");
}

describe("readLog", () => {
  it("returns file contents when file exists", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("existing content");
    const { readLog } = await getModule();
    expect(readLog()).toBe("existing content");
  });

  it("returns empty string when file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const { readLog } = await getModule();
    expect(readLog()).toBe("");
  });
});

describe("appendEntry", () => {
  it("appends entry on a new line when log has content", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("21/7\n9:30 10s");
    const { appendEntry } = await getModule();
    const result = appendEntry("10:00, 15s");
    expect(result).toBe("21/7\n9:30 10s\n10:00, 15s");
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining("wa-log.txt"),
      "21/7\n9:30 10s\n10:00, 15s",
      "utf-8"
    );
  });

  it("appends without extra newline when log already ends with newline", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("21/7\n9:30 10s\n");
    const { appendEntry } = await getModule();
    const result = appendEntry("10:00, 15s");
    expect(result).toBe("21/7\n9:30 10s\n10:00, 15s");
  });

  it("writes entry directly when log is empty", async () => {
    mockExistsSync.mockReturnValue(false);
    const { appendEntry } = await getModule();
    const result = appendEntry("10:00, 15s");
    expect(result).toBe("10:00, 15s");
  });

  it("returns the full updated log", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("line1\nline2");
    const { appendEntry } = await getModule();
    const result = appendEntry("line3");
    expect(result).toContain("line1");
    expect(result).toContain("line2");
    expect(result).toContain("line3");
  });
});
