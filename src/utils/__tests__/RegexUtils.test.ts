import { describe, it, expect } from 'vitest';
import {
  escapeRegex,
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern
} from '../RegexUtils.js';

describe('RegexUtils', () => {
  it('convertMatchPatternToRegExpString should return $. for invalid patterns', () => {
    expect(convertMatchPatternToRegExpString('')).toBe('$.');
    expect(convertMatchPatternToRegExpString('invalid')).toBe('$.');
    expect(convertMatchPatternToRegExpString('http://')).toBe('$.');
  });

  it('convertMatchPatternToRegExp should handle errors gracefully', () => {
    expect(convertMatchPatternToRegExp('invalid').test('any')).toBe(false);
  });

  it('matchGlobPattern should handle invalid patterns', () => {
    expect(matchGlobPattern('', 'any')).toBe(false);
  });

  it('escapeRegex works', () => { expect(escapeRegex('.')).toBe('\\.'); });
  it('convertMatchPatternToRegExpString works', () => { expect(convertMatchPatternToRegExpString('*://*/*')).toContain('https?'); });
  it('matchGlobPattern works', () => {
      expect(matchGlobPattern('*.js', 'a.js')).toBe(true);
      expect(matchGlobPattern('**/*.js', 'dir/a.js')).toBe(true);
  });
});
