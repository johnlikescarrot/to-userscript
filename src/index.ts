import { ConversionConfig, ConversionContext } from './core/ConversionContext.js';
import { MigrationEngine } from './core/MigrationEngine.js';
import { LoadManifestStep } from './steps/LoadManifestStep.js';
import { ProcessResourcesStep } from './steps/ProcessResourcesStep.js';
import { GenerateAssetsStep } from './steps/GenerateAssetsStep.js';
import { AssembleStep } from './steps/AssembleStep.js';

export async function convertExtension(config: ConversionConfig) {
  const context = new ConversionContext(config);
  const engine = new MigrationEngine(context);

  engine
    .addStep(new LoadManifestStep())
    .addStep(new ProcessResourcesStep())
    .addStep(new GenerateAssetsStep())
    .addStep(new AssembleStep());

  await engine.run();
}

export * from './core/types.js';
export * from './schemas/ManifestSchema.js';
