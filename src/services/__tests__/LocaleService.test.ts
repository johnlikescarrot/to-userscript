import { describe, it, expect, vi } from 'vitest';
import { LocaleService } from '../LocaleService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('LocaleService', () => {
  const messages = {
    'extName': { 'message': 'My Extension' },
    'extDesc': { 'message': 'A description with $1' }
  };

  it('should load messages from file', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue(messages);
    const res = await LocaleService.loadMessages('root', 'en');
    expect(res).toEqual(messages);
  });

  it('should return empty object if locale file missing', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    const res = await LocaleService.loadMessages('root', 'en');
    expect(res).toEqual({});
  });

  it('should return empty object on read error', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockRejectedValue(new Error('fail'));
    const res = await LocaleService.loadMessages('root', 'en');
    expect(res).toEqual({});
  });

  it('should replace placeholders in strings', () => {
    const content = 'Name: __MSG_extName__';
    expect(LocaleService.replacePlaceholders(content, messages)).toBe('Name: My Extension');
  });

  it('should handle missing messages gracefully', () => {
    const content = 'Missing: __MSG_missing__';
    expect(LocaleService.replacePlaceholders(content, messages)).toBe('Missing: __MSG_missing__');
  });

  it('should replace placeholders in objects recursively', () => {
    const obj = {
      name: '__MSG_extName__',
      nested: {
        desc: '__MSG_extDesc__'
      },
      list: ['__MSG_extName__', 'static']
    };
    const expected = {
      name: 'My Extension',
      nested: {
        desc: 'A description with $1'
      },
      list: ['My Extension', 'static']
    };
    expect(LocaleService.replaceInObject(obj, messages)).toEqual(expected);
  });

  it('should handle non-string/non-object types in replaceInObject', () => {
    expect(LocaleService.replaceInObject(123, messages)).toBe(123);
    expect(LocaleService.replaceInObject(null, messages)).toBeNull();
  });
});
