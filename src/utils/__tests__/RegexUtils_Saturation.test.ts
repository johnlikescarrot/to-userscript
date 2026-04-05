import { describe, it, expect } from 'vitest';
import {
  convertMatchPatternToRegExpString,
  convertMatchPatternToRegExp,
  matchGlobPattern
} from '../RegexUtils.js';

describe('Regex Saturation', () => {
  it('covers all RegexUtils branches', () => {
    expect(convertMatchPatternToRegExpString('http://*/*')).toContain('http');
    expect(convertMatchPatternToRegExpString('https://*.com/*')).toContain('com');
    expect(convertMatchPatternToRegExpString('file:///path/*')).toContain('file');
    expect(convertMatchPatternToRegExpString('invalid')).toBe('$.');
    expect(convertMatchPatternToRegExpString('http://')).toBe('$.');
    expect(convertMatchPatternToRegExpString(null as any)).toBe('$.');

    expect(convertMatchPatternToRegExp('<all_urls>').test('http://a.com')).toBe(true);
    expect(convertMatchPatternToRegExp('http://*.').test('a')).toBe(false);

    expect(matchGlobPattern('a/b', 'a/b')).toBe(true);
    expect(matchGlobPattern('a', null as any)).toBe(false);
    expect(matchGlobPattern('[[[', 'test')).toBe(false);

    expect(convertMatchPatternToRegExpString('http://host/*')).toContain('(?:\\/.*)?');
    expect(convertMatchPatternToRegExpString('file://path')).toBe('^file:\\/\\/\\/path(?:[?#]|$)');
  });
});
