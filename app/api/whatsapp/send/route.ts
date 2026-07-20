import { NextResponse } from "next/server";
import { getWhatsAppStatus, sendWhatsAppMessage } from "@/lib/whatsapp";
import { formatTimerMessage } from "@/lib/timer";

const TIME_RE = /^\d{2}:\d{2}$/;

export async function POST(req: Request) {
  const { status } = getWhatsAppStatus();
  if (status !== "ready") {
    return NextResponse.json({ error: "WhatsApp not ready" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { seconds, time } = body as Record<string, unknown>;

  if (typeof seconds !== "number" || seconds < 0) {
    return NextResponse.json({ error: "seconds must be a non-negative number" }, { status: 400 });
  }
  if (typeof time !== "string" || !TIME_RE.test(time)) {
    return NextResponse.json({ error: "time must be HH:MM format" }, { status: 400 });
  }

  const message = formatTimerMessage(time, seconds);

  try {
    await sendWhatsAppMessage(message);
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
