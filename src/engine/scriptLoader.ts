import { parseScript } from './parser';
import {
  CRITICAL_INTRO_ASSETS,
  STORY_IMAGE_ASSETS,
  createAssetPreloadPlan,
  preloadImages
} from './preload';
import type { RuntimeAssetManifest } from './preload';
import type { ScenarioCommand } from './types';
import { preloadTransparentImages } from '../hooks/useTransparentImage';

const DEFAULT_SCRIPT_FILES = ['prologue.txt', 'chapter01.txt'] as const;
const SCRIPT_MANIFEST_URL = '/scripts/manifest.json';
const RUNTIME_ASSET_MANIFEST_URL = '/assets/runtime-asset-manifest.json';

export type ScriptLabels = { [label: string]: ScenarioCommand[] };

export class ScenarioLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioLoadError';
  }
}

const uniqueAssets = (assets: readonly string[]): readonly string[] => Array.from(new Set(assets));
const isCharacterSpriteAsset = (src: string): boolean => src.includes('/assets/char/');

const readScriptManifest = async (): Promise<readonly string[]> => {
  const response = await fetch(SCRIPT_MANIFEST_URL);
  if (!response.ok) {
    return DEFAULT_SCRIPT_FILES;
  }

  const parsed: unknown = await response.json();
  if (!Array.isArray(parsed)) {
    return DEFAULT_SCRIPT_FILES;
  }

  const scriptFiles = parsed.filter((entry): entry is string => (
    typeof entry === 'string' && entry.endsWith('.txt')
  ));

  return scriptFiles.length > 0 ? scriptFiles : DEFAULT_SCRIPT_FILES;
};

const readRuntimeAssetManifest = async (): Promise<RuntimeAssetManifest | null> => {
  const response = await fetch(RUNTIME_ASSET_MANIFEST_URL);
  if (!response.ok) return null;

  const parsed: unknown = await response.json();
  if (!parsed || typeof parsed !== 'object' || !('assets' in parsed)) {
    return null;
  }

  const { assets } = parsed;
  if (!Array.isArray(assets)) return null;

  return {
    assets: assets.filter((asset): asset is RuntimeAssetManifest['assets'][number] => {
      if (!asset || typeof asset !== 'object') return false;
      return (
        'id' in asset &&
        'kind' in asset &&
        'path' in asset &&
        typeof asset.id === 'string' &&
        typeof asset.kind === 'string' &&
        typeof asset.path === 'string'
      );
    })
  };
};

const collectLabelCommands = (labels: ScriptLabels): readonly ScenarioCommand[] => (
  Object.values(labels).flat()
);

export const loadScenarioScripts = async (
  setLoadingMessage: (message: string) => void
): Promise<ScriptLabels> => {
  setLoadingMessage('시나리오 서책을 펼치는 중...');
  const scriptFiles = await readScriptManifest();
  const scriptTexts = await Promise.all(
    scriptFiles.map(async (scriptFile) => {
      const response = await fetch(`/scripts/${scriptFile}`);
      if (!response.ok) {
        throw new ScenarioLoadError(`Unable to load script file: ${scriptFile}`);
      }
      return response.text();
    })
  );

  const labels = scriptTexts.reduce<ScriptLabels>(
    (mergedLabels, scriptText) => ({
      ...mergedLabels,
      ...parseScript(scriptText)
    }),
    {}
  );
  const runtimeManifest = await readRuntimeAssetManifest();
  const preloadPlan = runtimeManifest
    ? createAssetPreloadPlan(collectLabelCommands(labels), runtimeManifest)
    : null;
  const criticalAssets = uniqueAssets([
    ...CRITICAL_INTRO_ASSETS,
    ...(preloadPlan?.critical || [])
  ]);
  const storyAssets = uniqueAssets(
    preloadPlan ? preloadPlan.referenced.map((asset) => asset.src) : STORY_IMAGE_ASSETS
  );
  const criticalCharacterSprites = criticalAssets.filter(isCharacterSpriteAsset);
  const characterSprites = uniqueAssets([
    ...criticalCharacterSprites,
    ...storyAssets.filter(isCharacterSpriteAsset)
  ]);

  setLoadingMessage('첫 장면의 그림자를 준비하는 중...');
  await preloadImages(criticalAssets, { timeoutMs: 5000 });
  setLoadingMessage('등장인물의 그림자를 벗기는 중...');
  await preloadTransparentImages(characterSprites, { threshold: 40, batchSize: 2 });
  void preloadImages(storyAssets, { timeoutMs: 9000 });

  return labels;
};
