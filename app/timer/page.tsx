"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WaStatus = "idle" | "qr" | "ready" | "disconnected";

interface StatusResponse {
  status: WaStatus;
  qr?: string;
}

interface SendResult {
  ok: boolean;
  message?: string;
  error?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function currentHHMM() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function TimerPage() {
  const [waStatus, setWaStatus] = useState<WaStatus>("idle");
  const [qr, setQr] = useState<string | undefined>();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sending, setSending] = useState(false);

  const startMsRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data: StatusResponse = await res.json();
      setWaStatus(data.status);
      setQr(data.qr);
    } catch {
      // network error — keep last known status
    }
  }, []);

  useEffect(() => {
    pollStatus();
    const id = setInterval(pollStatus, 5_000);
    return () => clearInterval(id);
  }, [pollStatus]);

  const handleStart = useCallback(() => {
    startMsRef.current = Date.now();
    setElapsed(0);
    setSendResult(null);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startMsRef.current!) / 1000));
    }, 1_000);
  }, []);

  const handleStop = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);

    const seconds = Math.round((Date.now() - startMsRef.current!) / 1000);
    const time = currentHHMM();

    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds, time }),
      });
      const data: SendResult = await res.json();
      setSendResult(data);
    } catch (err) {
      setSendResult({ ok: false, error: String(err) });
    } finally {
      setSending(false);
    }
  }, []);

  const statusColor: Record<WaStatus, string> = {
    idle: "text-zinc-400",
    qr: "text-yellow-400",
    ready: "text-emerald-400",
    disconnected: "text-red-400",
  };

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <h1 className="text-2xl font-semibold">Timer</h1>

      {/* WhatsApp status strip */}
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
        <span className="text-zinc-400">WhatsApp:</span>
        <span className={statusColor[waStatus]}>{waStatus}</span>
      </div>

      {waStatus === "qr" && qr && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-zinc-400">Scan to connect</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="WhatsApp QR code" className="h-48 w-48 rounded" />
        </div>
      )}

      {/* Elapsed display */}
      <div className="text-6xl font-mono tabular-nums">{elapsed}s</div>

      {/* Controls */}
      <div className="flex gap-4">
        {!running ? (
          <button
            onClick={handleStart}
            className="rounded-lg bg-emerald-600 px-8 py-3 text-lg font-semibold hover:bg-emerald-500 active:bg-emerald-700"
          >
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={sending}
            className="rounded-lg bg-red-600 px-8 py-3 text-lg font-semibold hover:bg-red-500 active:bg-red-700 disabled:opacity-50"
          >
            Stop
          </button>
        )}
      </div>

      {/* Send feedback */}
      {sending && <p className="text-sm text-zinc-400">Sending…</p>}
      {sendResult && !sending && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            sendResult.ok
              ? "border-emerald-800 bg-emerald-950 text-emerald-300"
              : "border-red-800 bg-red-950 text-red-300"
          }`}
        >
          {sendResult.ok ? `Sent: ${sendResult.message}` : `Error: ${sendResult.error}`}
        </div>
      )}
    </div>
  );
}
