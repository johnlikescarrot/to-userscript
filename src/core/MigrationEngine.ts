import { ConversionContext } from './ConversionContext.js';
import { Step } from './Step.js';

export class MigrationEngine {
  private steps: Step[] = [];

  constructor(private context: ConversionContext) {}

  addStep(step: Step): this {
    this.steps.push(step);
    return this;
  }

  async run(): Promise<void> {
    this.context.logger.info('Starting conversion engine...');
    for (const step of this.steps) {
      await step.execute(this.context);
    }
    this.context.logger.success('All conversion steps completed successfully.');
  }
}
