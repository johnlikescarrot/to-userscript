import { ConversionConfig, ConversionContext } from './core/ConversionContext.js';
import { MigrationEngine } from './core/MigrationEngine.js';
import { LoadManifestStep } from './steps/LoadManifestStep.js';
import { ProcessResourcesStep } from './steps/ProcessResourcesStep.js';
import { GenerateAssetsStep } from './steps/GenerateAssetsStep.js';
import { AssembleStep } from './steps/AssembleStep.js';
import { UnpackService } from './services/UnpackService.js';
import { NormalizedManifest } from './schemas/ManifestSchema.js';
import fs from 'fs-extra';
import { ResourceResult } from './core/types.js';

export async function convertExtension(config: ConversionConfig) {
  let inputDir = config.inputDir;
  let isTempDir = false;

  if (!(await fs.pathExists(inputDir))) {
    throw new Error(`Input directory or archive not found: ${inputDir}`);
  }

  const stats = await fs.stat(inputDir);
  if (stats.isFile()) {
    inputDir = await UnpackService.unpack(inputDir);
    isTempDir = true;
  }

  try {
    const context = new ConversionContext({ ...config, inputDir });
    const engine = new MigrationEngine(context);

    engine
      .addStep(new LoadManifestStep())
      .addStep(new ProcessResourcesStep())
      .addStep(new GenerateAssetsStep())
      .addStep(new AssembleStep());

    await engine.run();

    const manifest = context.get<NormalizedManifest>('manifest');
    const resources = context.get<ResourceResult>('resources');

    return {
      success: true,
      outputFile: config.outputFile,
      extension: {
          name: manifest.name,
          version: manifest.version,
          description: manifest.description
      },
      stats: {
          jsFiles: Object.keys(resources.jsContents).length,
          cssFiles: Object.keys(resources.cssContents).length,
          assets: Object.keys(context.get('assetMap')).length
      }
    };
  } finally {
    if (isTempDir && inputDir) {
      await fs.remove(inputDir).catch(() => {});
    }
  }
}

export * from './core/types.js';
export * from './schemas/ManifestSchema.js';
export * from './core/ConversionContext.js';
