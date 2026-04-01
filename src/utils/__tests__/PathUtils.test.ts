import { describe, it, expect } from 'vitest';
import { normalizePath } from '../PathUtils.js';

describe('PathUtils', () => {
  it('should normalize paths to use forward slashes', () => {
    expect(normalizePath('path\\\\to\\\\file')).toBe('path/to/file');
    expect(normalizePath('path/to/file')).toBe('path/to/file');
  });
});
