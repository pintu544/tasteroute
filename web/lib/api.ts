const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function apiHealth(): Promise<{ ok: boolean; qloo: string }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`API health check failed: ${res.status}`);
  return res.json();
}
