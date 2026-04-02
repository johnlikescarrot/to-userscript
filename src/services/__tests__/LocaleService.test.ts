import { describe, it, expect, vi } from 'vitest';
import { LocaleService } from '../LocaleService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('LocaleService', () => {
  it('should cover all placeholder and iteration branches', () => {
    const msgs = { 'm': { message: 'val' } };
    expect(LocaleService.replacePlaceholders('__MSG_m__', msgs)).toBe('val');
    expect(LocaleService.replacePlaceholders('__MSG_x__', msgs)).toBe('__MSG_x__');

    expect(LocaleService.replaceInObject(['__MSG_m__'], msgs)).toEqual(['val']);
    expect(LocaleService.replaceInObject({ a: '__MSG_m__' }, msgs)).toEqual({ a: 'val' });
    expect(LocaleService.replaceInObject(1, msgs)).toBe(1);
  });

  it('should handle locale traversal and loading', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue({ m: { message: 'v' } });

    expect(await LocaleService.loadMessages('r', 'en')).toBeDefined();
    expect(await LocaleService.loadMessages('r', '../evil')).toEqual({});

    vi.mocked(fs.pathExists).mockResolvedValue(false);
    expect(await LocaleService.loadMessages('r', 'en')).toEqual({});
  });
});
