import { describe, it, expect, vi } from 'vitest';
import { ConversionContext } from '../ConversionContext.js';
import { Step } from '../Step.js';
import { DownloadService } from '../../services/DownloadService.js';
import { matchGlobPattern } from '../../utils/RegexUtils.js';
import { Logger } from '../../utils/Logger.js';
import fetch from 'node-fetch';

vi.mock('node-fetch');

class FailStep extends Step {
  readonly name = 'Fail';
  async run() { throw new Error('fail'); }
}

describe('Absolute Perfection: Final Logic Verification', () => {
  it('ConversionContext: throws on missing key', () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: '.', target: 'userscript' });
    expect(() => ctx.get('nonexistent')).toThrow('State key "nonexistent" not found');
  });

  it('Step: handles failed step execution', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: '.', target: 'userscript' });
    const step = new FailStep();
    await expect(step.execute(ctx)).rejects.toThrow('fail');
  });

  it('DownloadService: handles failed download', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, statusText: 'Not Found' } as any);
    await expect(DownloadService.download('http://url', 'dest')).rejects.toThrow('Failed to download: Not Found');
  });

  it('RegexUtils: matchGlobPattern null/undefined', () => {
      expect(matchGlobPattern(null as any, 'path')).toBe(false);
  });

  it('Logger: stopSpinner without message', () => {
      const logger = new Logger('test');
      vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.startSpinner('s');
      logger.stopSpinner(true);
      logger.startSpinner('s2');
      logger.stopSpinner(false);
  });
});
