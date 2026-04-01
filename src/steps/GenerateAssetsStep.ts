import { Step } from '../core/Step.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { AssetService } from '../services/AssetService.js';
import { Manifest } from '../schemas/ManifestSchema.js';

export class GenerateAssetsStep extends Step {
  readonly name = 'Generate Assets Map';

  async run(context: ConversionContext): Promise<void> {
    const manifest = context.get<Manifest>('manifest');
    const { inputDir } = context.config;

    const assetMap = await AssetService.generateAssetMap(inputDir, manifest);
    context.set('assetMap', assetMap);
  }
}
