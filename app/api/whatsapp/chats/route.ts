import { NextResponse } from "next/server";
import { getWhatsAppChats, getWhatsAppStatus } from "@/lib/whatsapp";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(_req: Request) {
  const { status } = getWhatsAppStatus();
  if (status !== "ready") {
    return NextResponse.json({ error: `WhatsApp not ready (status: ${status})` }, { status: 503 });
  }

  // getChats() can fail immediately after ready while WA Web syncs the chat list.
  // Retry up to 3 times with increasing delays.
  let lastError: unknown;
  for (const wait of [0, 2000, 4000]) {
    if (wait) await delay(wait);
    try {
      const chats = await getWhatsAppChats();
      return NextResponse.json(chats);
    } catch (err) {
      lastError = err;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  return NextResponse.json({ error: `getChats failed: ${msg}` }, { status: 500 });
}
