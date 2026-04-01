import { describe, it, expect, vi } from 'vitest';
import { TemplateService } from '../TemplateService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('TemplateService', () => {
  it('should replace strings correctly with dollar signs', () => {
    const content = 'Hello {{NAME}}';
    const res = TemplateService.replace(content, { '{{NAME}}': 'World' });
    expect(res).toBe('Hello World');

    const content2 = 'Value: {{VAL}}';
    const res2 = TemplateService.replace(content2, { '{{VAL}}': '$100' });
    expect(res2).toBe('Value: $100');
  });

  it('should load template with fallback', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (path: any) => {
      return path.toString().endsWith('.template.js');
    });
    vi.mocked(fs.readFile).mockResolvedValue('template content');

    const res = await TemplateService.load('my-template');
    expect(res).toBe('template content');
  });
});
