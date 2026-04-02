import { describe, it, expect, vi } from 'vitest';
import { TemplateService } from '../TemplateService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('TemplateService', () => {
  it('should load template with .template.js fallback', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (p: any) => p.toString().endsWith('.template.js'));
    vi.mocked(fs.readFile).mockResolvedValue('template_content');
    expect(await TemplateService.load('my_template')).toBe('template_content');
  });

  it('should throw if no template or fallback exists', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    await expect(TemplateService.load('none')).rejects.toThrow('Template not found');
  });

  it('should replace and escape dollar signs', () => {
    expect(TemplateService.replace('{{K}}', { '{{K}}': '$' })).toBe('$');
  });
});
