import { describe, it, expect, vi } from 'vitest';
import { parser } from '../index.js';

describe('CLI Integration', () => {
  it('should show help message', async () => {
    const help = await new Promise<string>((resolve) => {
      parser.parse('--help', (err: any, argv: any, output: string) => {
        resolve(output);
      });
    });
    expect(help).toContain('Convert an extension to a userscript');
  });
});
