import { formatApiVersion } from './version';

describe('formatApiVersion', () => {
  it('formats a semver version', () => {
    expect(formatApiVersion({ version: '1.2.3' })).toBe('API v1.2.3');
  });

  it('does not double the v prefix', () => {
    expect(formatApiVersion({ version: 'v1.2.3' })).toBe('API v1.2.3');
  });

  it('falls back to "API dev" when version is missing, empty or non-string', () => {
    expect(formatApiVersion({})).toBe('API dev');
    expect(formatApiVersion({ version: '' })).toBe('API dev');
    expect(formatApiVersion({ version: 42 })).toBe('API dev');
    expect(formatApiVersion({ version: 'dev' })).toBe('API dev');
  });

  it('returns null when the health check failed', () => {
    expect(formatApiVersion(null)).toBeNull();
    expect(formatApiVersion(undefined)).toBeNull();
  });
});
