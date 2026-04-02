import { describe, it, expect, vi } from 'vitest';
import { TemplateService } from '../TemplateService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('TemplateService', () => {
  it('should load template with fallback', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p.toString().endsWith('.template.js'));
    vi.mocked(fs.readFile).mockResolvedValue('content');
    expect(await TemplateService.load('name')).toBe('content');
  });

  it('should throw if template not found', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    await expect(TemplateService.load('none')).rejects.toThrow('Template not found');
  });

  it('should replace strings correctly', () => {
    expect(TemplateService.replace('{{K}}', { '{{K}}': 'V' })).toBe('V');
  });
});
