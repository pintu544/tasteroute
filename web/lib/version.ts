/** Label shown in the footer for the API build, e.g. "API v1.2.3" or "API dev". */
export function formatApiVersion(health: { version?: unknown } | null | undefined): string | null {
  // Health endpoint unreachable -> render footer without a version.
  if (!health) return null;
  const raw = typeof health.version === 'string' ? health.version.trim() : '';
  if (!raw || raw === 'dev') return 'API dev';
  return `API v${raw.replace(/^v/i, '')}`;
}
