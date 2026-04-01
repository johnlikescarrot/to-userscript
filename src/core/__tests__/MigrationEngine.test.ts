import { describe, it, expect, vi } from 'vitest';
import { MigrationEngine } from '../MigrationEngine.js';
import { ConversionContext } from '../ConversionContext.js';
import { Step } from '../Step.js';

class MockStep extends Step {
  readonly name = 'Mock Step';
  async run() {}
}

describe('MigrationEngine', () => {
  it('should execute steps in order', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: '.', target: 'userscript' });
    const engine = new MigrationEngine(ctx);
    const step = new MockStep();
    const spy = vi.spyOn(step, 'execute');

    engine.addStep(step);
    await engine.run();

    expect(spy).toHaveBeenCalledWith(ctx);
  });
});
