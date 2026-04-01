import { Step } from '../core/Step.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { ManifestService } from '../services/ManifestService.js';
import path from 'path';

export class LoadManifestStep extends Step {
  readonly name = 'Load Manifest';

  async run(context: ConversionContext): Promise<void> {
    const manifestPath = path.join(context.config.inputDir, 'manifest.json');
    const manifest = await ManifestService.load(manifestPath);
    context.set('manifest', manifest);
  }
}
