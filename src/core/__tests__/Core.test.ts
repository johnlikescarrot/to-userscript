import { describe, it, expect, vi } from 'vitest';
import { ConversionContext } from '../ConversionContext.js';
import { Step } from '../Step.js';

class FailStep extends Step {
    readonly name = 'Fail Step';
    async run() { throw new Error('Planned Failure'); }
}

describe('Core Classes', () => {
  it('ConversionContext should throw when getting non-existent key', () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: '.', target: 'userscript' });
    expect(() => ctx.get('nonexistent')).toThrow('State key "nonexistent" not found');
  });

  it('Step should handle execution errors', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: '.', target: 'userscript' });
    const step = new FailStep();
    await expect(step.execute(ctx)).rejects.toThrow('Planned Failure');
  });
});
