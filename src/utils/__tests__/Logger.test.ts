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
  const consoleSpy = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  };

  it('should cover all logging methods and branches', () => {
    const logger = new Logger();
    logger.info('i');
    logger.success('s');
    logger.warn('w');
    logger.error('e', new Error('fail'));

    expect(consoleSpy.log).toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.error).toHaveBeenCalled();

    logger.startSpinner('load');
    logger.stopSpinner(true, 'ok');
    logger.startSpinner('load2');
    logger.stopSpinner(false, 'fail');
    logger.stopSpinner(); // branch where spinner is null
  });
});
