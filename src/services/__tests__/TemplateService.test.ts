import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateService } from '../TemplateService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('TemplateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (TemplateService as any).templatesDirCache = null;
  });

  it('should load template from direct path', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readFile).mockResolvedValue('direct' as any);
      const res = await TemplateService.load('direct');
      expect(res).toBe('direct');
  });

  it('should load template from fallback path', async () => {
      vi.mocked(fs.pathExists)
        .mockResolvedValueOnce(false as never) // dist check in getTemplatesDir
        .mockResolvedValueOnce(false as never) // direct check in load
        .mockResolvedValueOnce(true as never);  // fallback check in load
      vi.mocked(fs.readFile).mockResolvedValue('fallback' as any);
      const res = await TemplateService.load('test');
      expect(res).toBe('fallback');
  });

  it('should hit cache in getTemplatesDir', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readFile).mockResolvedValue('content' as any);

      await TemplateService.load('a');
      const countAfterFirst = vi.mocked(fs.pathExists).mock.calls.length;

      await TemplateService.load('b');
      const countAfterSecond = vi.mocked(fs.pathExists).mock.calls.length;

      // First load: 1 (dist check) + 1 (direct check) = 2
      // Second load: 0 (cached dir) + 1 (direct check) = 1
      expect(countAfterSecond - countAfterFirst).toBe(1);
  });

  it('should throw when nothing exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as never);
      await expect(TemplateService.load('none')).rejects.toThrow('Template not found');
  });

  it('should replace strings correctly, including dollar signs', () => {
    const res = TemplateService.replace('{{P}}', { '{{P}}': '$100' });
    expect(res).toBe('$100');
  });
});
