import { Step } from '../core/Step.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { ResourceService } from '../services/ResourceService.js';
import { Manifest } from '../schemas/ManifestSchema.js';

export class ProcessResourcesStep extends Step {
  readonly name = 'Process Resources';

  async run(context: ConversionContext): Promise<void> {
    const manifest = context.get<Manifest>('manifest');
    const { inputDir } = context.config;

    const resources = await ResourceService.readScriptsAndStyles(
      inputDir,
      manifest.content_scripts || []
    );
    context.set('resources', resources);

    const backgroundScripts = manifest.background?.service_worker
      ? [manifest.background.service_worker]
      // @ts-ignore
      : manifest.background?.scripts || [];

    const backgroundJs = await ResourceService.readBackgroundScripts(inputDir, backgroundScripts);
    context.set('backgroundJs', backgroundJs);
  }
}
