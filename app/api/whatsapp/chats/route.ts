import { NextResponse } from "next/server";
import { getWhatsAppChats, getWhatsAppStatus, getSeenChats } from "@/lib/whatsapp";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(_req: Request) {
  const { status } = getWhatsAppStatus();
  if (status !== "ready") {
    return NextResponse.json({ error: `WhatsApp not ready (status: ${status})` }, { status: 503 });
  }

  // getChats() can fail while WA Web syncs. Retry up to 3 times.
  for (const wait of [0, 2000, 4000]) {
    if (wait) await delay(wait);
    try {
      const chats = await getWhatsAppChats();
      return NextResponse.json(chats);
    } catch {
      // try again
    }
  }

  // Fall back to chats seen via incoming messages — send a message to the
  // target group from your phone and refresh this endpoint to populate.
  const seen = getSeenChats();
  if (seen.length > 0) {
    return NextResponse.json(seen);
  }

  return NextResponse.json(
    { error: "getChats() unavailable. Send a message to your group from your phone, then refresh this endpoint." },
    { status: 503 }
  );
}
