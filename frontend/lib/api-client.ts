import type { AudioChunkRes, CoachSnapshotRes, CreateSessionRes, FinalizeRes } from "@/types/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API}${input}`, { ...init, headers });
}

export interface SessionInput {
  title: string;
  script?: string;
  judgingCriteria?: string;
  deck?: File | null;
}

export async function createSession(input: SessionInput): Promise<CreateSessionRes> {
  const fd = new FormData();
  fd.set("title", input.title);
  if (input.script) fd.set("script", input.script);
  if (input.judgingCriteria) fd.set("judging_criteria", input.judgingCriteria);
  if (input.deck) fd.set("deck", input.deck, input.deck.name);
  const res = await authedFetch("/api/v1/sessions", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`createSession failed: ${res.status}`);
  return res.json();
}

export async function uploadAudioChunk(
  sessionId: string,
  blob: Blob,
  chunkIndex: number,
  chunkStartMs: number,
): Promise<AudioChunkRes> {
  const fd = new FormData();
  fd.set("audio", blob, `chunk-${chunkIndex}.webm`);
  fd.set("chunk_index", String(chunkIndex));
  fd.set("chunk_start_ms", String(chunkStartMs));
  const res = await authedFetch(`/api/v1/sessions/${sessionId}/audio-chunk`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`audio chunk failed: ${res.status}`);
  return res.json();
}

export async function uploadVisualTick(
  sessionId: string,
  payload: {
    ts_ms: number;
    eye_contact_ratio: number;
    head_stability: number;
    body_sway: number;
    gesture_usage: number;
    smile_naturalness: number;
  },
): Promise<{ ok: boolean }> {
  const res = await authedFetch(`/api/v1/sessions/${sessionId}/visual-tick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`visual tick failed: ${res.status}`);
  return res.json();
}

export async function coachSnapshot(
  sessionId: string,
  frame: Blob,
  metricsWindow: Record<string, number>,
): Promise<CoachSnapshotRes> {
  const fd = new FormData();
  fd.set("frame", frame, "frame.jpg");
  fd.set("metrics_window", JSON.stringify(metricsWindow));
  const res = await authedFetch(`/api/v1/sessions/${sessionId}/coach-snapshot`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`coach snapshot failed: ${res.status}`);
  return res.json();
}

export async function finalizeSession(
  sessionId: string,
  transcript: string,
  durationSeconds: number,
): Promise<FinalizeRes> {
  const res = await authedFetch(`/api/v1/sessions/${sessionId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, duration_seconds: durationSeconds }),
  });
  if (!res.ok) throw new Error(`finalize failed: ${res.status}`);
  return res.json();
}

export async function fetchReport(sessionId: string): Promise<FinalizeRes> {
  const res = await authedFetch(`/api/v1/sessions/${sessionId}/report`);
  if (!res.ok) throw new Error(`report fetch failed: ${res.status}`);
  return res.json();
}
