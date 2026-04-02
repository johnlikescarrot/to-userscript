import { describe, it, expect } from 'vitest';
import {
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern,
  escapeRegex
} from '../RegexUtils.js';

describe('RegexUtils', () => {
  it('should verify regex behavior for various patterns', () => {
    expect(convertMatchPatternToRegExpString('http://')).toBe('$.');
    expect(convertMatchPatternToRegExpString('')).toBe('$.');

    const wildcardScheme = convertMatchPatternToRegExp('*://*/*');
    expect(wildcardScheme.test('http://example.com/')).toBe(true);
    expect(wildcardScheme.test('https://sub.domain/path?q=1#hash')).toBe(true); // Query/Hash test

    const subdomain = convertMatchPatternToRegExp('https://*.google.com/path*');
    expect(subdomain.test('https://mail.google.com/path/to/resource?auth=true')).toBe(true);
    expect(subdomain.test('https://google.com/path')).toBe(false); // Browser behavior: *. matches subdomains only

    const exact = convertMatchPatternToRegExp('http://host');
    expect(exact.test('http://host/')).toBe(true);
    expect(exact.test('http://host?query')).toBe(true);
    expect(exact.test('http://host#hash')).toBe(true);
  });

  it('should collapse wildcards to prevent ReDoS', () => {
    const res = convertMatchPatternToRegExpString('a*b**c***');
    // regex should not contain consecutive .*
    expect(res).not.toContain('.*.*');
  });

  it('should handle regex errors and special patterns', () => {
    expect(convertMatchPatternToRegExp('!!!').test('a')).toBe(false);
    expect(convertMatchPatternToRegExp('<all_urls>').test('a')).toBe(true);
  });

  it('should handle glob branches', () => {
    expect(matchGlobPattern('**', 'a')).toBe(true);
    expect(matchGlobPattern('a', 'a')).toBe(true);
    expect(matchGlobPattern('[', 'a')).toBe(false);
    expect(matchGlobPattern('', 'a')).toBe(false);
    expect(matchGlobPattern('*.js', 'test.js')).toBe(true);
    expect(matchGlobPattern('src/**/*.ts', 'src/core/MigrationEngine.ts')).toBe(true);
  });

  it('should escape regex properly', () => {
    expect(escapeRegex('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe('a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o');
  });
});
