import { NextResponse } from "next/server";
import { getWhatsAppStatus } from "@/lib/whatsapp";

export function GET() {
  return NextResponse.json(getWhatsAppStatus());
}
