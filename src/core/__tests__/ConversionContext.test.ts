import { describe, it, expect } from 'vitest';
import { ConversionContext } from '../ConversionContext.js';

describe('ConversionContext', () => {
  it('should store and retrieve state', () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: '.', target: 'userscript' });
    ctx.set('key', 'val');
    expect(ctx.get('key')).toBe('val');
  });

  it('should throw if key not found', () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: '.', target: 'userscript' });
    expect(() => ctx.get('missing')).toThrow('State key "missing" not found');
  });
});
