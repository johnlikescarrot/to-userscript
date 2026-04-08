import { describe, it, expect, vi } from 'vitest';
import { LoadManifestStep } from '../LoadManifestStep.js';
import { ProcessResourcesStep } from '../ProcessResourcesStep.js';
import { GenerateAssetsStep } from '../GenerateAssetsStep.js';
import { ConversionContext } from '../../core/ConversionContext.js';
import { ManifestService } from '../../services/ManifestService.js';
import { ResourceService } from '../../services/ResourceService.js';
import { AssetService } from '../../services/AssetService.js';

vi.mock('../../services/ManifestService.js');
vi.mock('../../services/ResourceService.js');
vi.mock('../../services/AssetService.js');
vi.mock('../../utils/RegexUtils.js', () => ({
  matchGlobPattern: vi.fn().mockReturnValue(true),
  globToRegex: vi.fn().mockReturnValue(/.*/),
  dnrUrlFilterToRegex: vi.fn().mockReturnValue(/.*/),
  escapeRegex: (s) => s
}));

describe('Conversion Steps', () => {
  const ctx = new ConversionContext({ inputDir: 'in', outputFile: 'out.js', target: 'userscript' });

  it('LoadManifestStep should load manifest', async () => {
    const mockManifest = { name: 'test' };
    vi.mocked(ManifestService.load).mockResolvedValue(mockManifest as any);
    await new LoadManifestStep().execute(ctx);
    expect(ctx.get('manifest')).toBe(mockManifest);
  });

  it('ProcessResourcesStep should process scripts', async () => {
    ctx.set('manifest', { content_scripts: [], background_scripts: [], dnr_rule_resources: [] });
    vi.mocked(ResourceService.readScriptsAndStyles).mockResolvedValue({ jsContents: {}, cssContents: {} });
    vi.mocked(ResourceService.readBackgroundScripts).mockResolvedValue({});
    await new ProcessResourcesStep().execute(ctx);
    expect(ctx.get('resources')).toBeDefined();
    expect(ctx.get('backgroundJs')).toBeDefined();
  });

  it('GenerateAssetsStep should generate map', async () => {
    ctx.set('manifest', {});
    vi.mocked(AssetService.generateAssetMap).mockResolvedValue({ 'a.png': 'data' });
    await new GenerateAssetsStep().execute(ctx);
    expect(ctx.get('assetMap')).toEqual({ 'a.png': 'data' });
  });
});
