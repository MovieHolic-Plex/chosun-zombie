import { access, readdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'public/assets/runtime-asset-manifest.json');
const SCRIPTS_DIR = path.join(ROOT, 'public/scripts');
const SCRIPT_MANIFEST_PATH = path.join(SCRIPTS_DIR, 'manifest.json');
const TYPES_PATH = path.join(ROOT, 'src/engine/types.ts');
const CROWD_LIMIT = 2;
const CROWD_EXCEPTION = /vn-validator:\s*allow-crowd\s+(.+)/i;
const CHARACTER_ENTRY = /'([^']+)':\s*'([^']+)'/g;

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const assetKey = (kind, id) => `${kind}:${id}`;

const toRelativePath = (assetPath) => assetPath.startsWith('public/')
  ? assetPath
  : assetPath.replace(/^\/+/, '');

const toDisplayLocation = (reference) => `${reference.scriptName}:${reference.lineNum}`;

const readManifest = async () => {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
  if (!isObject(parsed) || !Array.isArray(parsed.assets)) {
    throw new Error('runtime asset manifest must contain an assets array');
  }

  const assets = [];
  for (const asset of parsed.assets) {
    if (
      isObject(asset)
      && typeof asset.kind === 'string'
      && typeof asset.id === 'string'
      && typeof asset.path === 'string'
    ) {
      assets.push({ kind: asset.kind, id: asset.id, path: asset.path });
    }
  }

  return assets;
};

const readCharacterMap = async () => {
  const raw = await readFile(TYPES_PATH, 'utf8');
  const map = new Map();
  for (const match of raw.matchAll(CHARACTER_ENTRY)) {
    map.set(match[1], match[2]);
  }
  if (map.size === 0) {
    throw new Error('CHARACTER_MAP entries were not found in src/engine/types.ts');
  }
  return map;
};

const listScriptFiles = async () => {
  try {
    const raw = await readFile(SCRIPT_MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
    if (!Array.isArray(parsed)) {
      throw new Error('script manifest must contain an array of script file names');
    }

    const scriptFiles = parsed
      .filter((entry) => typeof entry === 'string' && entry.endsWith('.txt'))
      .map((entry) => path.join(SCRIPTS_DIR, entry));

    if (scriptFiles.length > 0) {
      return Array.from(new Set(scriptFiles)).sort();
    }
  } catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  const entries = await readdir(SCRIPTS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.txt'))
    .map((entry) => path.join(SCRIPTS_DIR, entry.name))
    .sort();
};

const createIssue = (issue) => ({
  severity: issue.severity,
  location: toDisplayLocation(issue.reference),
  message: issue.message
});

const resolveCharacterCode = (state, charId) => state.characterMap.get(charId) ?? charId;

const checkReferencedAsset = async (state, reference) => {
  const asset = state.manifest.get(assetKey(reference.kind, reference.id));
  if (!asset) {
    state.issues.push(createIssue({
      severity: 'error',
      reference,
      message: `Missing manifest entry for ${reference.kind}:${reference.id}`
    }));
    return;
  }

  const assetPath = path.join(ROOT, toRelativePath(asset.path));
  try {
    await access(assetPath, constants.R_OK);
  } catch (error) {
    if (error instanceof Error) {
      state.issues.push(createIssue({
        severity: 'error',
        reference,
        message: `Missing file for ${reference.kind}:${reference.id} at ${asset.path}`
      }));
      return;
    }
    throw error;
  }
};

const countBlockingBeat = (state, trimmed) => {
  if (
    trimmed === 'menu:'
    || trimmed.startsWith('"')
    || /^[^\s"]+\s+\S+\s+"/u.test(trimmed)
  ) {
    state.stats.blockingBeatCount += 1;
    state.afterReset = false;
  }
};

const checkCrowding = (state, reference) => {
  if (state.visible.size <= CROWD_LIMIT) {
    return;
  }

  const visibleList = Array.from(state.visible).join(', ');
  if (state.afterReset) {
    state.stats.resetCrowdAllowanceCount += 1;
    return;
  }

  if (state.crowdException) {
    state.issues.push(createIssue({
      severity: 'warning',
      reference,
      message: `Crowding exception used for ${visibleList}: ${state.crowdException}`
    }));
    state.crowdException = '';
    return;
  }

  state.issues.push(createIssue({
    severity: 'error',
    reference,
    message: `More than ${CROWD_LIMIT} character sprites shown simultaneously: ${visibleList}`
  }));
};

const validateScript = async (state, scriptPath) => {
  const scriptName = path.relative(ROOT, scriptPath).replaceAll(path.sep, '/');
  const raw = await readFile(scriptPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const lineNum = index + 1;
    const trimmed = line.trim();
    const exception = trimmed.match(CROWD_EXCEPTION);
    if (exception) {
      state.crowdException = exception[1].trim();
      continue;
    }
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    const scene = trimmed.match(/^scene\s+bg\s+([A-Za-z0-9_-]+)/);
    if (scene) {
      state.stats.sceneResetCount += 1;
      state.visible.clear();
      state.afterReset = true;
      await checkReferencedAsset(state, { scriptName, lineNum, kind: 'bg', id: scene[1] });
      continue;
    }

    const cinematic = trimmed.match(/^cinematic\s+([A-Za-z0-9_-]+)/);
    if (cinematic) {
      state.stats.cinematicCount += 1;
      state.visible.clear();
      state.afterReset = true;
      await checkReferencedAsset(state, { scriptName, lineNum, kind: 'cg', id: cinematic[1] });
      continue;
    }

    const show = trimmed.match(/^show\s+char\s+(.+?)\s+([A-Za-z0-9_]+)(?:\s+at\s+(?:left|center|right))?(?:\s+with\s+[A-Za-z0-9_-]+)?$/u);
    if (show) {
      state.stats.characterShowCount += 1;
      const charId = show[1].trim();
      const expression = show[2].toLowerCase();
      const id = `${resolveCharacterCode(state, charId)}_${expression}`;
      state.visible.add(charId);
      await checkReferencedAsset(state, { scriptName, lineNum, kind: 'char', id });
      await checkReferencedAsset(state, { scriptName, lineNum, kind: 'face', id });
      checkCrowding(state, { scriptName, lineNum });
      continue;
    }

    const hide = trimmed.match(/^hide\s+char\s+(.+?)(?:\s+with\s+[A-Za-z0-9_-]+)?$/u);
    if (hide) {
      state.visible.delete(hide[1].trim());
      continue;
    }

    countBlockingBeat(state, trimmed);
  }
};

const main = async () => {
  const assets = await readManifest();
  const characterMap = await readCharacterMap();
  const scriptFiles = await listScriptFiles();
  const manifest = new Map(assets.map((asset) => [assetKey(asset.kind, asset.id), asset]));
  const state = {
    characterMap,
    manifest,
    visible: new Set(),
    issues: [],
    afterReset: false,
    crowdException: '',
    stats: {
      blockingBeatCount: 0,
      cinematicCount: 0,
      characterShowCount: 0,
      resetCrowdAllowanceCount: 0,
      sceneResetCount: 0
    }
  };

  for (const scriptPath of scriptFiles) {
    state.visible.clear();
    state.afterReset = false;
    state.crowdException = '';
    await validateScript(state, scriptPath);
  }

  const densityBase = Math.max(1, state.stats.blockingBeatCount);
  const cutsceneDensity = (state.stats.cinematicCount / densityBase * 100).toFixed(1);
  console.log(`VN asset validator: ${assets.length} runtime manifest entries loaded`);
  console.log(`Scripts: ${scriptFiles.map((scriptPath) => path.basename(scriptPath)).join(', ')}`);
  console.log(`Cinematics: ${state.stats.cinematicCount}; blocking beats: ${state.stats.blockingBeatCount}; cutscene density: ${cutsceneDensity}%`);
  console.log(`Scenes: ${state.stats.sceneResetCount}; character shows: ${state.stats.characterShowCount}; reset crowd allowances: ${state.stats.resetCrowdAllowanceCount}`);

  for (const issue of state.issues) {
    console.log(`${issue.severity.toUpperCase()} ${issue.location} ${issue.message}`);
  }

  if (state.issues.some((issue) => issue.severity === 'error')) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  throw error;
});
