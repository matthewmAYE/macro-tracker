import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture event handlers registered by the client under test.
let mockHandlers: Record<string, (...args: unknown[]) => void> = {};
let mockSendMessage: ReturnType<typeof vi.fn>;
let mockInitialize: ReturnType<typeof vi.fn>;

vi.mock("whatsapp-web.js", () => ({
  Client: vi.fn().mockImplementation(function () {
    mockSendMessage = vi.fn().mockResolvedValue(undefined);
    mockInitialize = vi.fn();
    return {
      on: vi.fn().mockImplementation((event: string, handler: (...a: unknown[]) => void) => {
        mockHandlers[event] = handler;
      }),
      initialize: mockInitialize,
      sendMessage: mockSendMessage,
      getChats: vi.fn().mockResolvedValue([
        { id: { _serialized: "111@c.us" }, name: "Alice" },
        { id: { _serialized: "abc@g.us" }, name: "Training Group" },
      ]),
    };
  }),
  LocalAuth: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,TESTQR"),
  },
}));

// Reset global singleton and mock call counts between tests.
beforeEach(() => {
  vi.clearAllMocks();
  mockHandlers = {};
  const g = global as typeof globalThis & { __wa?: unknown };
  delete g.__wa;
});

// Lazy import after mocks are set up.
async function getModule() {
  return import("./whatsapp");
}

describe("getWhatsAppStatus", () => {
  it("returns idle before initWhatsApp is called", async () => {
    const { getWhatsAppStatus } = await getModule();
    expect(getWhatsAppStatus()).toEqual({ status: "idle" });
  });
});

describe("initWhatsApp", () => {
  it("creates a Client and calls initialize()", async () => {
    const { initWhatsApp } = await getModule();
    const { Client } = await import("whatsapp-web.js");
    initWhatsApp();
    expect(Client).toHaveBeenCalledOnce();
    expect(mockInitialize).toHaveBeenCalledOnce();
  });

  it("is idempotent — calling twice does not create a second client", async () => {
    const { initWhatsApp } = await getModule();
    const { Client } = await import("whatsapp-web.js");
    initWhatsApp();
    initWhatsApp();
    expect(Client).toHaveBeenCalledOnce();
  });

  it("transitions to qr state and stores data URL when qr event fires", async () => {
    const { initWhatsApp, getWhatsAppStatus } = await getModule();
    initWhatsApp();
    await mockHandlers["qr"]("QR_STRING_FROM_WA");
    const { status, qr } = getWhatsAppStatus();
    expect(status).toBe("qr");
    expect(qr).toBe("data:image/png;base64,TESTQR");
  });

  it("transitions to ready and clears qr when ready event fires", async () => {
    const { initWhatsApp, getWhatsAppStatus } = await getModule();
    initWhatsApp();
    await mockHandlers["qr"]("QR_STRING_FROM_WA");
    mockHandlers["ready"]();
    const { status, qr } = getWhatsAppStatus();
    expect(status).toBe("ready");
    expect(qr).toBeUndefined();
  });

  it("transitions to disconnected when disconnected event fires", async () => {
    const { initWhatsApp, getWhatsAppStatus } = await getModule();
    initWhatsApp();
    mockHandlers["ready"]();
    mockHandlers["disconnected"]();
    expect(getWhatsAppStatus().status).toBe("disconnected");
  });
});

describe("sendWhatsAppMessage", () => {
  it("throws when client is not ready (idle state)", async () => {
    const { sendWhatsAppMessage } = await getModule();
    await expect(sendWhatsAppMessage("test")).rejects.toThrow(/not ready/i);
  });

  it("throws when WHATSAPP_TARGET_CHAT is not set", async () => {
    const { initWhatsApp, sendWhatsAppMessage } = await getModule();
    const original = process.env.WHATSAPP_TARGET_CHAT;
    delete process.env.WHATSAPP_TARGET_CHAT;
    initWhatsApp();
    mockHandlers["ready"]();
    await expect(sendWhatsAppMessage("test")).rejects.toThrow(/WHATSAPP_TARGET_CHAT/);
    process.env.WHATSAPP_TARGET_CHAT = original;
  });

  it("sends the message text to the configured chat ID", async () => {
    process.env.WHATSAPP_TARGET_CHAT = "60123456789@c.us";
    const { initWhatsApp, sendWhatsAppMessage } = await getModule();
    initWhatsApp();
    mockHandlers["ready"]();
    await sendWhatsAppMessage("14:35, 47s");
    expect(mockSendMessage).toHaveBeenCalledWith("60123456789@c.us", "14:35, 47s");
    delete process.env.WHATSAPP_TARGET_CHAT;
  });
});

describe("getWhatsAppChats", () => {
  it("returns an array of { id, name } pairs", async () => {
    const { initWhatsApp, getWhatsAppChats } = await getModule();
    initWhatsApp();
    mockHandlers["ready"]();
    const chats = await getWhatsAppChats();
    expect(chats).toEqual([
      { id: "111@c.us", name: "Alice" },
      { id: "abc@g.us", name: "Training Group" },
    ]);
  });

  it("throws when client is not ready", async () => {
    const { getWhatsAppChats } = await getModule();
    await expect(getWhatsAppChats()).rejects.toThrow(/not ready/i);
  });
});
