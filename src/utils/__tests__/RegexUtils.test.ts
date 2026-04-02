import { describe, it, expect } from 'vitest';
import {
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern
} from '../RegexUtils.js';

describe('RegexUtils', () => {
  it('should handle all convertMatchPatternToRegExpString paths', () => {
    expect(convertMatchPatternToRegExpString('http://')).toBe('$.');
    expect(convertMatchPatternToRegExpString('https://*')).toBeDefined();
    expect(convertMatchPatternToRegExpString('https://host/path*')).toContain('host/path');
    expect(convertMatchPatternToRegExpString('https://*.host/')).toContain('host/');
  });

  it('should handle error cases in convertMatchPatternToRegExp', () => {
    expect(convertMatchPatternToRegExp('!!!').test('any')).toBe(false);
    expect(convertMatchPatternToRegExp('<all_urls>').test('any')).toBe(true);
  });

  it('should handle all glob paths', () => {
    expect(matchGlobPattern('**', 'any')).toBe(true);
    expect(matchGlobPattern('a', 'a')).toBe(true);
    expect(matchGlobPattern('[', 'a')).toBe(false);
    expect(matchGlobPattern('', 'a')).toBe(false);
  });
});
