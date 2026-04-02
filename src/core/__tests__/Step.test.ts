import { describe, it, expect, vi } from 'vitest';
import { Step } from '../Step.js';
import { ConversionContext } from '../ConversionContext.js';

class FailStep extends Step {
  readonly name = 'Fail';
  async run() { throw new Error('step failed'); }
}

describe('Step', () => {
  it('should log failure on error', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: '.', target: 'userscript' });
    const step = new FailStep();
    await expect(step.execute(ctx)).rejects.toThrow('step failed');
  });
});
