import { NextResponse } from "next/server";
import { getWhatsAppChats, getWhatsAppStatus } from "@/lib/whatsapp";

export async function GET(_req: Request) {
  const { status } = getWhatsAppStatus();
  if (status !== "ready") {
    return NextResponse.json({ error: `WhatsApp not ready (status: ${status})` }, { status: 503 });
  }
  const chats = await getWhatsAppChats();
  return NextResponse.json(chats);
}
