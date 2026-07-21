import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetStatus = vi.fn();
const mockSend = vi.fn();
const mockAppendEntry = vi.fn();

vi.mock("@/lib/whatsapp", () => ({
  getWhatsAppStatus: mockGetStatus,
  sendWhatsAppMessage: mockSend,
}));

vi.mock("@/lib/log", () => ({
  appendEntry: mockAppendEntry,
}));

async function getRoute() {
  return import("./route");
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStatus.mockReturnValue({ status: "ready" });
  mockSend.mockResolvedValue(undefined);
  mockAppendEntry.mockImplementation((entry: string) => `FULL LOG\n${entry}`);
});

describe("POST /api/whatsapp/send", () => {
  it("returns 503 when WhatsApp is not ready", async () => {
    mockGetStatus.mockReturnValue({ status: "qr" });
    const { POST } = await getRoute();
    const res = await POST(makeRequest({ seconds: 10, time: "14:00" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/not ready/i);
  });

  it("returns 400 when seconds is missing", async () => {
    const { POST } = await getRoute();
    const res = await POST(makeRequest({ time: "14:00" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when seconds is negative", async () => {
    const { POST } = await getRoute();
    const res = await POST(makeRequest({ seconds: -1, time: "14:00" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when time is missing", async () => {
    const { POST } = await getRoute();
    const res = await POST(makeRequest({ seconds: 30 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when time is not HH:MM format", async () => {
    const { POST } = await getRoute();
    const res = await POST(makeRequest({ seconds: 30, time: "2pm" }));
    expect(res.status).toBe(400);
  });

  it("sends the correctly formatted message and returns 200", async () => {
    const { POST } = await getRoute();
    const res = await POST(makeRequest({ seconds: 47, time: "14:35" }));
    expect(res.status).toBe(200);
    expect(mockAppendEntry).toHaveBeenCalledWith("14:35, 47s");
    expect(mockSend).toHaveBeenCalledWith("FULL LOG\n14:35, 47s");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBe("14:35, 47s");
  });

  it("returns 500 when sendWhatsAppMessage throws", async () => {
    mockSend.mockRejectedValue(new Error("connection dropped"));
    const { POST } = await getRoute();
    const res = await POST(makeRequest({ seconds: 10, time: "10:00" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/connection dropped/i);
  });
});
