import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetStatus = vi.fn();

vi.mock("@/lib/whatsapp", () => ({
  getWhatsAppStatus: mockGetStatus,
}));

async function getRoute() {
  return import("./route");
}

const req = new Request("http://localhost/api/whatsapp/status");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/whatsapp/status", () => {
  it("returns status when ready", async () => {
    mockGetStatus.mockReturnValue({ status: "ready" });
    const { GET } = await getRoute();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ready" });
  });

  it("returns status and qr data URL when in qr state", async () => {
    mockGetStatus.mockReturnValue({
      status: "qr",
      qr: "data:image/png;base64,ABCD",
    });
    const { GET } = await getRoute();
    const res = await GET(req);
    const body = await res.json();
    expect(body.status).toBe("qr");
    expect(body.qr).toBe("data:image/png;base64,ABCD");
  });

  it("returns idle status when not initialised", async () => {
    mockGetStatus.mockReturnValue({ status: "idle" });
    const { GET } = await getRoute();
    const res = await GET(req);
    const body = await res.json();
    expect(body.status).toBe("idle");
  });

  it("returns disconnected status", async () => {
    mockGetStatus.mockReturnValue({ status: "disconnected" });
    const { GET } = await getRoute();
    const res = await GET(req);
    const body = await res.json();
    expect(body.status).toBe("disconnected");
  });
});
