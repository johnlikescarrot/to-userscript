import { ConversionContext } from './ConversionContext.js';

export abstract class Step {
  abstract readonly name: string;
  abstract run(context: ConversionContext): Promise<void>;

  public async execute(context: ConversionContext): Promise<void> {
    context.logger.startSpinner(`Step: ${this.name}...`);
    try {
      await this.run(context);
      context.logger.stopSpinner(true, `Completed ${this.name}`);
    } catch (error) {
      context.logger.stopSpinner(false, `Failed ${this.name}`);
      throw error;
    }
  }
}
