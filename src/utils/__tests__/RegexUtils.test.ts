import { describe, it, expect } from 'vitest';
import {
  escapeRegex,
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern
} from '../RegexUtils.js';

describe('RegexUtils', () => {
  it('should escape regex', () => {
      expect(escapeRegex('.')).toBe('\\.');
  });

  it('should handle all convertMatchPatternToRegExpString branches', () => {
      expect(convertMatchPatternToRegExpString(123 as any)).toBe('$.');
      expect(convertMatchPatternToRegExpString('')).toBe('$.');
      expect(convertMatchPatternToRegExpString('bad')).toBe('$.');
      expect(convertMatchPatternToRegExpString('*://google.com/*')).toContain('https?|file|ftp');
      expect(convertMatchPatternToRegExpString('https://google.com/*')).toContain('https');
      expect(convertMatchPatternToRegExpString('http://')).toBe('$.');
      expect(convertMatchPatternToRegExpString('https://*.google.com/*')).toContain('google');
      expect(convertMatchPatternToRegExpString('https://*/a')).toContain('[^/]+');
      expect(convertMatchPatternToRegExpString('https://google.com')).toContain('google');
      expect(convertMatchPatternToRegExpString('https://google.com/')).toContain('google');
  });

  it('should handle all convertMatchPatternToRegExp branches', () => {
      expect(convertMatchPatternToRegExp('<all_urls>').test('http://a.com')).toBe(true);
      expect(convertMatchPatternToRegExp('https://google.com/*').test('https://google.com/a')).toBe(true);
  });

  it('should handle all matchGlobPattern branches', () => {
      expect(matchGlobPattern('', 'a')).toBe(false);
      expect(matchGlobPattern('a', '')).toBe(false);
      expect(matchGlobPattern('a.js', 'a.js')).toBe(true);
      expect(matchGlobPattern('*.js', 'a.js')).toBe(true);
  });
});
