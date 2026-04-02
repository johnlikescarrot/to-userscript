import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateService } from '../TemplateService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('TemplateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load template from direct path', async () => {
      vi.mocked(fs.pathExistsSync).mockReturnValue(true as never);
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readFile).mockResolvedValue('direct' as any);
      const res = await TemplateService.load('direct');
      expect(res).toBe('direct');
  });

  it('should load template from fallback path', async () => {
      vi.mocked(fs.pathExistsSync).mockReturnValue(false as never);
      vi.mocked(fs.pathExists)
        .mockResolvedValueOnce(false as never) // direct
        .mockResolvedValueOnce(true as never); // fallback
      vi.mocked(fs.readFile).mockResolvedValue('fallback' as any);
      const res = await TemplateService.load('test');
      expect(res).toBe('fallback');
  });

  it('should hit dev template branch in getTemplatesDir', async () => {
      vi.mocked(fs.pathExistsSync)
        .mockReturnValueOnce(false as never) // dist
        .mockReturnValueOnce(true as never); // src
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readFile).mockResolvedValue('dev' as any);
      const res = await TemplateService.load('dev');
      expect(res).toBe('dev');
  });

  it('should throw when nothing exists', async () => {
      vi.mocked(fs.pathExistsSync).mockReturnValue(false as never);
      vi.mocked(fs.pathExists).mockResolvedValue(false as never);
      await expect(TemplateService.load('none')).rejects.toThrow('Template not found');
  });

  it('should replace strings correctly, including dollar signs', () => {
    const res = TemplateService.replace('{{P}}', { '{{P}}': '$100' });
    expect(res).toBe('$100');
  });
});
