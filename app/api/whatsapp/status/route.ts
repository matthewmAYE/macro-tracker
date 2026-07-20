import { NextResponse } from "next/server";
import { getWhatsAppStatus } from "@/lib/whatsapp";

export function GET(_req: Request) {
  return NextResponse.json(getWhatsAppStatus());
}
