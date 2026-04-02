import { describe, it, expect } from 'vitest';
import {
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern
} from '../RegexUtils.js';

describe('RegexUtils', () => {
  it('should cover all pattern branches', () => {
    expect(convertMatchPatternToRegExpString('http://')).toBe('$.');
    expect(convertMatchPatternToRegExpString('')).toBe('$.');
    expect(convertMatchPatternToRegExpString('http://host')).toContain('host');
    expect(convertMatchPatternToRegExpString('*://*/*')).toBeDefined();
    expect(convertMatchPatternToRegExpString('https://*.google.com/path*')).toContain('google');
  });

  it('should handle regex errors', () => {
    expect(convertMatchPatternToRegExp('!!!').test('a')).toBe(false);
    expect(convertMatchPatternToRegExp('<all_urls>').test('a')).toBe(true);
  });

  it('should handle glob branches', () => {
    expect(matchGlobPattern('**', 'a')).toBe(true);
    expect(matchGlobPattern('a', 'a')).toBe(true);
    expect(matchGlobPattern('[', 'a')).toBe(false);
    expect(matchGlobPattern('', 'a')).toBe(false);
  });
});
