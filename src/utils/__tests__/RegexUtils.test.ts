import { describe, it, expect } from 'vitest';
import {
  escapeRegex,
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern
} from '../RegexUtils.js';

describe('RegexUtils Saturation', () => {
  it('convertMatchPatternToRegExpString - exhaustive', () => {
    expect(convertMatchPatternToRegExpString('http://*/*')).toContain('http');
    expect(convertMatchPatternToRegExpString('https://*.com/*')).toContain('https');
    expect(convertMatchPatternToRegExpString('file:///path/*')).toContain('file');
    expect(convertMatchPatternToRegExpString('invalid')).toBe('$.');
    expect(convertMatchPatternToRegExpString('//google.com')).toBe('$.');
    expect(convertMatchPatternToRegExpString('http:///path')).toBe('$.');
    expect(convertMatchPatternToRegExpString('http://a.com/*')).toContain('(?:/.*)?');
  });

  it('convertMatchPatternToRegExp - exhaustive', () => {
    expect(convertMatchPatternToRegExp('<all_urls>').test('http://a.com')).toBe(true);
    // Force error in regex construction
    expect(convertMatchPatternToRegExp('http://*.').test('a')).toBe(false);
  });

  it('matchGlobPattern - exhaustive', () => {
    expect(matchGlobPattern('a/b', 'a/b')).toBe(true);
    expect(matchGlobPattern('a', null as any)).toBe(false);
    // Force error in regex construction
    expect(matchGlobPattern('[', 'a')).toBe(false);
  });
});
