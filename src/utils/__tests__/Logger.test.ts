import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../Logger.js';
import ora from 'ora';

vi.mock('ora', () => ({
  default: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })
}));

describe('Logger', () => {
  let logger: Logger;
  const consoleSpy = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  };

  beforeEach(() => {
    logger = new Logger('test');
    vi.clearAllMocks();
  });

  it('info should log to console', () => {
    logger.info('msg');
    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('msg'));
  });

  it('success should log to console', () => {
    logger.success('msg');
    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('msg'));
  });

  it('warn should log to console', () => {
    logger.warn('msg');
    expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('msg'));
  });

  it('error should log to console with optional error object', () => {
    const err = new Error('fail');
    logger.error('msg', err);
    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('msg'));
    expect(consoleSpy.error).toHaveBeenCalledWith(err);
  });

  it('should handle spinners', () => {
    logger.startSpinner('loading');
    expect(ora).toHaveBeenCalled();
    logger.stopSpinner(true, 'done');
    logger.stopSpinner(false, 'failed');
  });

  it('stopSpinner should be no-op if no spinner started', () => {
    logger.stopSpinner(); // Should not throw
  });
});
