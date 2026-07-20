import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode";

export type WaStatus = "idle" | "qr" | "ready" | "disconnected";

interface WaState {
  status: WaStatus;
  qr?: string;
  client?: Client;
}

// Global guard so HMR in Next.js dev mode doesn't spawn a new Puppeteer
// browser on every hot-reload — mirrors the pattern used in lib/prisma.ts.
const g = global as typeof globalThis & { __wa?: WaState };

function state(): WaState {
  if (!g.__wa) g.__wa = { status: "idle" };
  return g.__wa;
}

export function getWhatsAppStatus(): { status: WaStatus; qr?: string } {
  const s = state();
  return { status: s.status, ...(s.qr ? { qr: s.qr } : {}) };
}

export function initWhatsApp(): void {
  const s = state();
  if (s.client) return; // already initialised — idempotent

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./whatsapp-session" }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      // Uncomment to skip the ~170 MB Chromium download and use system Chrome:
      // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    },
  });

  s.client = client;

  client.on("qr", async (qr: string) => {
    s.status = "qr";
    s.qr = await qrcode.toDataURL(qr);
  });

  client.on("authenticated", () => {
    s.qr = undefined;
  });

  client.on("ready", () => {
    s.status = "ready";
    s.qr = undefined;
  });

  client.on("disconnected", () => {
    s.status = "disconnected";
    s.client = undefined;
    // Attempt one reconnect after a short delay.
    setTimeout(() => initWhatsApp(), 5_000);
  });

  client.initialize();
}

export async function sendWhatsAppMessage(text: string): Promise<void> {
  const s = state();
  if (s.status !== "ready" || !s.client) {
    throw new Error(`WhatsApp not ready (status: ${s.status})`);
  }
  const chatId = process.env.WHATSAPP_TARGET_CHAT;
  if (!chatId) throw new Error("WHATSAPP_TARGET_CHAT is not configured");
  await s.client.sendMessage(chatId, text);
}

export async function getWhatsAppChats(): Promise<{ id: string; name: string }[]> {
  const s = state();
  if (s.status !== "ready" || !s.client) {
    throw new Error(`WhatsApp not ready (status: ${s.status})`);
  }
  const chats = await s.client.getChats();
  return chats.map((c: { id: { _serialized: string }; name: string }) => ({
    id: c.id._serialized,
    name: c.name,
  }));
}
