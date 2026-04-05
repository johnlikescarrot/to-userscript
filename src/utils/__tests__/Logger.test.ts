import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../Logger.js';
import ora from 'ora';

const mockOraInstance = {
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
};

vi.mock('ora', () => ({
  default: vi.fn(() => mockOraInstance),
}));

describe('Logger', () => {
  let logger: Logger;
  const context = 'test-context';

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new Logger(context);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should log info messages', () => {
    logger.info('info message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[test-context] info message'));
  });

  it('should log success messages', () => {
    logger.success('success message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✔ [test-context] success message'));
  });

  it('should log warn messages', () => {
    logger.warn('warn message');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('⚠ [test-context] warn message'));
  });

  it('should log error messages with and without error object', () => {
    logger.error('error message');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('✖ [test-context] error message'));

    const err = new Error('nested error');
    logger.error('error with obj', err);
    expect(console.error).toHaveBeenCalledWith(err);
  });

  it('should handle spinner lifecycle', () => {
    logger.startSpinner('spinning');
    expect(ora).toHaveBeenCalled();
    expect(mockOraInstance.start).toHaveBeenCalled();

    logger.stopSpinner(true, 'done');
    expect(mockOraInstance.succeed).toHaveBeenCalled();

    logger.startSpinner('again');
    logger.stopSpinner(false, 'failed');
    expect(mockOraInstance.fail).toHaveBeenCalled();
  });

  it('should handle stopSpinner without an active spinner', () => {
    // Should not throw
    logger.stopSpinner(true, 'nothing');
    expect(mockOraInstance.succeed).not.toHaveBeenCalled();
  });

  it('should handle stopSpinner without a message', () => {
    logger.startSpinner('spinning');
    logger.stopSpinner(true);
    expect(mockOraInstance.succeed).toHaveBeenCalledWith(undefined);
  });

  it('should handle stopSpinner(false) without a message', () => {
    logger.startSpinner('spinning');
    logger.stopSpinner(false);
    expect(mockOraInstance.fail).toHaveBeenCalledWith(undefined);
  });
});
