import { describe, it, expect } from 'vitest';
import {
  escapeRegex,
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern
} from '../RegexUtils.js';

describe('RegexUtils', () => {
  it('should handle host and path normalization branches', () => {
    expect(convertMatchPatternToRegExpString('http://')).toBe('$.');
    expect(convertMatchPatternToRegExpString('https://host')).toContain('/host');
    expect(convertMatchPatternToRegExpString('https://host/*')).toContain('(?:/.*)?');
  });

  it('should handle error cases in convertMatchPatternToRegExp', () => {
    // We already have some error handling, adding a specific one for coverage
    expect(convertMatchPatternToRegExp('!!!').source).toBe('$.');
  });

  it('should handle matchGlobPattern direct match and invalid regex', () => {
    expect(matchGlobPattern('a', 'a')).toBe(true);
    expect(matchGlobPattern('[', 'a')).toBe(false);
  });
});
