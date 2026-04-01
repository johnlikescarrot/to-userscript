import { describe, it, expect, vi } from 'vitest';
import { ResourceService } from '../ResourceService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('ResourceService', () => {
  it('should read content scripts and styles', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('content');

    const res = await ResourceService.readScriptsAndStyles('root', [
      { js: ['s1.js'], css: ['c1.css'] }
    ]);

    expect(res.jsContents['s1.js']).toBe('content');
    expect(res.cssContents['c1.css']).toBe('content');
  });

  it('should read background scripts', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('bg-content');
    const res = await ResourceService.readBackgroundScripts('root', ['bg.js']);
    expect(res['bg.js']).toBe('bg-content');
  });
});
