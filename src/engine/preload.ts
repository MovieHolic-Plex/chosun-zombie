import { CHARACTER_MAP, assertNever } from './types';
import type { ScenarioCommand } from './types';

export interface AssetPreloadResult { readonly src: string; readonly ok: boolean; }

export type RuntimeAssetKind = 'bg' | 'cg' | 'char' | 'face';

export interface RuntimeAssetManifestEntry { readonly id: string; readonly kind: RuntimeAssetKind; readonly path: string; }

export interface RuntimeAssetManifest { readonly assets: readonly RuntimeAssetManifestEntry[]; }

export interface ScriptAssetReference {
  readonly kind: RuntimeAssetKind;
  readonly id: string;
  readonly src: string;
  readonly lineNum: number;
  readonly reason: 'scene' | 'cinematic' | 'character' | 'portrait';
}

export interface MissingScriptAsset {
  readonly kind: RuntimeAssetKind;
  readonly id: string;
  readonly lineNum: number;
  readonly reason: ScriptAssetReference['reason'];
}

export interface AssetPreloadPlan {
  readonly critical: readonly string[];
  readonly story: readonly string[];
  readonly referenced: readonly ScriptAssetReference[];
  readonly missing: readonly MissingScriptAsset[];
}

export interface AssetPreloadPlanOptions { readonly criticalIds?: readonly string[]; }

interface AssetLookupRequest { readonly kind: RuntimeAssetKind; readonly id: string; readonly reason: ScriptAssetReference['reason']; }

interface ImagePreloadOptions { readonly timeoutMs: number; }

const DEFAULT_IMAGE_TIMEOUT_MS = 7000;
const DEFAULT_CHARACTER_EXPRESSION = 'neutral';

const INTRO_STORY_PRIORITY_IDS = [
  'intro_snow_pass',
  'intro_refugees',
  'sealed_outpost',
  'cg001_national_collapse',
  'cg004_oath_under_snow',
  'ih_alert',
  'ih_serious'
] as const;

export const INTRO_BG = 'intro_snow_pass';

export const CRITICAL_INTRO_ASSETS = [
  '/assets/bg/intro_snow_pass.png', '/assets/bg/intro_refugees.png', '/assets/bg/sealed_outpost.png',
  '/assets/cg/cg001_national_collapse.png', '/assets/cg/cg004_oath_under_snow.png',
  '/assets/char/ih_alert.png', '/assets/char/ih_serious.png',
  '/assets/face/ih_alert.png', '/assets/face/ih_serious.png'
] as const;

export const STORY_IMAGE_ASSETS = [
  '/assets/bg/abandoned_inn.png', '/assets/bg/forbidden_village.png', '/assets/bg/intro_snow_pass.png',
  '/assets/bg/intro_refugees.png', '/assets/bg/ritual_shrine.png', '/assets/bg/sealed_outpost.png',
  '/assets/bg/town_market.png', '/assets/cg/ending_signal.png', '/assets/cg/opening_collapse.png',
  '/assets/cg/outpost_oath.png', '/assets/cg/ritual_geometry.png',
  '/assets/char/dp_loyal.png', '/assets/char/dp_neutral.png', '/assets/char/dp_startled.png',
  '/assets/char/dp_wary.png', '/assets/char/ih_alert.png', '/assets/char/ih_angry.png',
  '/assets/char/ih_anxious.png', '/assets/char/ih_neutral.png', '/assets/char/ih_protect.png',
  '/assets/char/ih_sad.png', '/assets/char/ih_serious.png', '/assets/char/ih_wounded.png',
  '/assets/char/sh_alert.png', '/assets/char/sh_anxious.png', '/assets/char/sh_flinch.png',
  '/assets/char/sh_neutral.png', '/assets/char/sh_numb.png', '/assets/char/sh_panic.png',
  '/assets/char/sh_soft.png', '/assets/char/sh_trance.png', '/assets/char/wh_neutral.png',
  '/assets/char/wh_omen.png', '/assets/char/wh_ritual.png', '/assets/char/wh_trance.png',
  '/assets/char/yg_alert.png', '/assets/char/yg_neutral.png',
  '/assets/face/dp_loyal.png', '/assets/face/dp_neutral.png', '/assets/face/dp_startled.png',
  '/assets/face/dp_wary.png', '/assets/face/ih_alert.png', '/assets/face/ih_angry.png',
  '/assets/face/ih_anxious.png', '/assets/face/ih_neutral.png', '/assets/face/ih_protect.png',
  '/assets/face/ih_sad.png', '/assets/face/ih_serious.png', '/assets/face/ih_wounded.png',
  '/assets/face/sh_alert.png', '/assets/face/sh_anxious.png', '/assets/face/sh_flinch.png',
  '/assets/face/sh_neutral.png', '/assets/face/sh_numb.png', '/assets/face/sh_panic.png',
  '/assets/face/sh_soft.png', '/assets/face/sh_trance.png', '/assets/face/wh_neutral.png',
  '/assets/face/wh_omen.png', '/assets/face/wh_ritual.png', '/assets/face/wh_trance.png',
  '/assets/face/yg_alert.png', '/assets/face/yg_neutral.png'
] as const;

const uniqueAssets = (assets: readonly string[]): readonly string[] => Array.from(new Set(assets));

const manifestKey = (kind: RuntimeAssetKind, id: string): string => `${kind}:${id}`;

const toRuntimeSrc = (path: string): string => {
  if (path.startsWith('/')) {
    return path;
  }

  if (path.startsWith('public/')) {
    return `/${path.substring(7)}`;
  }

  return `/${path}`;
};

const characterAssetId = (charId: string, expression: string): string => {
  const characterCode = CHARACTER_MAP[charId] || charId;
  return `${characterCode}_${expression.toLowerCase()}`;
};

const createManifestLookup = (
  manifest: RuntimeAssetManifest
): ReadonlyMap<string, RuntimeAssetManifestEntry> => {
  const lookup = new Map<string, RuntimeAssetManifestEntry>();
  for (const asset of manifest.assets) {
    lookup.set(manifestKey(asset.kind, asset.id), asset);
  }
  return lookup;
};

const createReference = (
  command: ScenarioCommand,
  lookup: ReadonlyMap<string, RuntimeAssetManifestEntry>,
  request: AssetLookupRequest
): ScriptAssetReference | MissingScriptAsset => {
  const asset = lookup.get(manifestKey(request.kind, request.id));
  if (!asset) {
    return {
      kind: request.kind,
      id: request.id,
      lineNum: command.lineNum,
      reason: request.reason
    };
  }

  return {
    kind: request.kind,
    id: request.id,
    src: toRuntimeSrc(asset.path),
    lineNum: command.lineNum,
    reason: request.reason
  };
};

export const collectScriptAssetReferences = (
  commands: readonly ScenarioCommand[],
  manifest: RuntimeAssetManifest
): Pick<AssetPreloadPlan, 'referenced' | 'missing'> => {
  const lookup = createManifestLookup(manifest);
  const referenced: ScriptAssetReference[] = [];
  const missing: MissingScriptAsset[] = [];

  for (const command of commands) {
    switch (command.type) {
      case 'scene':
        if (command.bgId) {
          const reference = createReference(command, lookup, {
            kind: 'bg',
            id: command.bgId,
            reason: 'scene'
          });
          if ('src' in reference) {
            referenced.push(reference);
          } else {
            missing.push(reference);
          }
        }
        break;
      case 'cinematic':
        if (command.cgId) {
          const reference = createReference(command, lookup, {
            kind: 'cg',
            id: command.cgId,
            reason: 'cinematic'
          });
          if ('src' in reference) {
            referenced.push(reference);
          } else {
            missing.push(reference);
          }
        }
        break;
      case 'show':
        if (command.charId) {
          const expression = command.expression || DEFAULT_CHARACTER_EXPRESSION;
          const id = characterAssetId(command.charId, expression);
          const sprite = createReference(command, lookup, {
            kind: 'char',
            id,
            reason: 'character'
          });
          const portrait = createReference(command, lookup, {
            kind: 'face',
            id,
            reason: 'portrait'
          });
          if ('src' in sprite) {
            referenced.push(sprite);
          } else {
            missing.push(sprite);
          }
          if ('src' in portrait) {
            referenced.push(portrait);
          } else {
            missing.push(portrait);
          }
        }
        break;
      case 'label':
      case 'hide':
      case 'play_music':
      case 'play_sound':
      case 'stop_music':
      case 'stop_sound':
      case 'effect':
      case 'variable':
      case 'menu':
      case 'jump':
      case 'dialogue':
      case 'narration':
        break;
      default:
        assertNever(command.type);
    }
  }

  return { referenced, missing };
};

export const createAssetPreloadPlan = (
  commands: readonly ScenarioCommand[],
  manifest: RuntimeAssetManifest,
  options: AssetPreloadPlanOptions = {}
): AssetPreloadPlan => {
  const { referenced, missing } = collectScriptAssetReferences(commands, manifest);
  const priorityIds: readonly string[] = options.criticalIds || INTRO_STORY_PRIORITY_IDS;
  const critical = referenced
    .filter((asset) => priorityIds.includes(asset.id))
    .map((asset) => asset.src);
  const story = critical;

  return {
    critical: uniqueAssets(critical),
    story: uniqueAssets(story),
    referenced,
    missing
  };
};

export const preloadImage = (
  src: string,
  options: ImagePreloadOptions = { timeoutMs: DEFAULT_IMAGE_TIMEOUT_MS }
): Promise<AssetPreloadResult> => {
  if (typeof Image === 'undefined') {
    return Promise.resolve({ src, ok: false });
  }

  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve({ src, ok: false });
    }, options.timeoutMs);

    img.onload = () => {
      window.clearTimeout(timer);
      resolve({ src, ok: true });
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      resolve({ src, ok: false });
    };

    img.decoding = 'async';
    img.src = src;
  });
};

export const preloadImages = async (
  assets: readonly string[],
  options: ImagePreloadOptions = { timeoutMs: DEFAULT_IMAGE_TIMEOUT_MS }
): Promise<readonly AssetPreloadResult[]> => {
  const preloadTasks = uniqueAssets(assets).map((asset) => preloadImage(asset, options));
  return Promise.all(preloadTasks);
};
