import { describe, it, expect } from 'vitest';
import {
  escapeRegex,
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern,
  dnrUrlFilterToRegex
} from '../RegexUtils.js';

describe('RegexUtils', () => {
  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegex('*.domain.com')).toBe('\\*\\.domain\\.com');
    });
  });

  describe('convertMatchPatternToRegExpString', () => {
    it('should handle * scheme', () => {
      const res = convertMatchPatternToRegExpString('*://google.com/*');
      expect(res).toMatch(/https\?\|file\|ftp/);
    });

    it('should handle specific scheme', () => {
      const res = convertMatchPatternToRegExpString('https://google.com/*');
      expect(res).toContain('^https');
    });

    it('should handle *.domain host', () => {
      const res = convertMatchPatternToRegExpString('https://*.google.com/*');
      expect(res).toContain('google\\.com');
      expect(res).toMatch(/\[\^\\?\/\]\+/);
    });

    it('should return nothing-matching regex for invalid patterns', () => {
      expect(convertMatchPatternToRegExpString('invalid')).toBe('$.');
    });
  });

  describe('convertMatchPatternToRegExp', () => {
    it('should handle <all_urls>', () => {
      const re = convertMatchPatternToRegExp('<all_urls>');
      expect(re.test('https://google.com')).toBe(true);
    });

    it('should match valid URLs', () => {
      const re = convertMatchPatternToRegExp('https://google.com/*');
      expect(re.test('https://google.com/path')).toBe(true);
      expect(re.test('http://google.com/path')).toBe(false);
    });
  });

  describe('matchGlobPattern', () => {
    it('should match simple patterns', () => {
      expect(matchGlobPattern('images/*', 'images/icon.png')).toBe(true);
      expect(matchGlobPattern('images/*', 'css/style.css')).toBe(false);
    });

    it('should handle recursive double star', () => {
      expect(matchGlobPattern('**/*.js', 'scripts/main.js')).toBe(true);
      expect(matchGlobPattern('**/*.js', 'lib/sub/other.js')).toBe(true);
    });
  });

  describe('dnrUrlFilterToRegex', () => {
    it('should handle || domain anchoring', () => {
      const re = dnrUrlFilterToRegex('||example.com');
      expect(re.test('https://example.com/')).toBe(true);
      expect(re.test('http://sub.example.com/path')).toBe(true);
      expect(re.test('https://not-example.com/')).toBe(false);
    });

    it('should handle | start anchoring', () => {
      const re = dnrUrlFilterToRegex('|https://example.com');
      expect(re.test('https://example.com/')).toBe(true);
      expect(re.test('http://example.com/')).toBe(false);
    });

    it('should handle | end anchoring', () => {
      const re = dnrUrlFilterToRegex('example.com|');
      expect(re.test('https://example.com')).toBe(true);
      expect(re.test('https://example.com/path')).toBe(false);
    });

    it('should handle * wildcards', () => {
      const re = dnrUrlFilterToRegex('example.com/*/test');
      expect(re.test('https://example.com/any/test')).toBe(true);
      expect(re.test('https://example.com/test')).toBe(false);
    });

    it('should handle ^ separators', () => {
      const re = dnrUrlFilterToRegex('example.com^');
      expect(re.test('https://example.com/')).toBe(true);
      expect(re.test('https://example.com?query')).toBe(true);
      expect(re.test('https://example.com.extra')).toBe(false);
    });
  });
});
