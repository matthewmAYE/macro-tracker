export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initWhatsApp } = await import("./lib/whatsapp");
    initWhatsApp();
  }
}
