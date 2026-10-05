const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export interface ItineraryStop {
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  affinity: number;
  rationale: string;
  qlooId?: string;
}

export interface PlanPayload {
  id: string;
  shareUrl: string;
  itinerary: { stops: ItineraryStop[]; summary?: string };
}

export interface PlanResponse {
  sessionId: string;
  intent: {
    occasion: string;
    vibe: string[];
    tastes: string[];
    area: string | null;
  };
  reply: string;
  plan: PlanPayload | null;
}

export interface SharedPlan {
  id: string;
  sessionId: string;
  brief: Record<string, unknown>;
  itinerary: { stops: ItineraryStop[]; summary?: string };
  createdAt: string;
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = (await res.json()) as { error?: string };
    return new Error(body.error ?? fallback);
  } catch {
    return new Error(`${fallback} (HTTP ${res.status})`);
  }
}

export async function postPlan(message: string, sessionId?: string): Promise<PlanResponse> {
  const res = await fetch(`${API_BASE}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) throw await parseError(res, 'Plan generation failed');
  return res.json();
}

export async function getSharedPlan(id: string): Promise<SharedPlan> {
  const res = await fetch(`${API_BASE}/api/plan/${id}`);
  if (!res.ok) throw await parseError(res, 'Plan not found');
  const body = (await res.json()) as { plan: SharedPlan };
  return body.plan;
}

export async function apiHealth(): Promise<{ ok: boolean; qloo: string }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`API health check failed: ${res.status}`);
  return res.json();
}
