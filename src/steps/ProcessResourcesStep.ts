import { Step } from '../core/Step.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { ResourceService } from '../services/ResourceService.js';
import { NormalizedManifest } from '../schemas/ManifestSchema.js';

export class ProcessResourcesStep extends Step {
  readonly name = 'Process Resources';

  async run(context: ConversionContext): Promise<void> {
    const manifest = context.get<NormalizedManifest>('manifest');
    const { inputDir } = context.config;

    const resources = await ResourceService.readScriptsAndStyles(
      inputDir,
      manifest.content_scripts
    );
    context.set('resources', resources);

    const backgroundJs = await ResourceService.readBackgroundScripts(
      inputDir,
      manifest.background_scripts
    );
    context.set('backgroundJs', backgroundJs);

    // Load Static DNR Rules
    const dnrRules: Record<string, any[]> = {};
    for (const res of manifest.dnr_rule_resources) {
      const fullPath = path.join(inputDir, res.path);
      if (await fs.pathExists(fullPath)) {
        try {
          dnrRules[res.id] = await fs.readJson(fullPath);
        } catch (e) {
          context.logger.warn(`Failed to parse DNR ruleset ${res.id} at ${res.path}`);
        }
      }
    }
    context.set('dnrRules', dnrRules);
  }
}
