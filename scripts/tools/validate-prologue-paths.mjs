import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SCRIPT_PATH = path.join(ROOT, 'public/scripts/prologue.txt');
const SCRIPT_MANIFEST_PATH = path.join(ROOT, 'public/scripts/manifest.json');
const ASSET_MANIFEST_PATH = path.join(ROOT, 'public/assets/runtime-asset-manifest.json');
const START_LABEL = 'scene_001';
const TERMINAL_LABEL = 'scene_prologue_end';
const MAX_DEPTH = 128;

const EXPECTED_NEW_CGS = [
  'cg006_seoha_first_bell',
  'cg007_unseen_watcher_marks',
  'cg010_well_talisman_voice',
  'cg011_dead_son_question',
  'cg012_mother_farewell',
  'cg013_hard_choice_aftermath',
  'cg014_door_sigil_laughter'
];

const EXPECTED_BRANCH_LABELS = [
  'scene_013_protect',
  'scene_013_record',
  'scene_022_well',
  'scene_022_leave',
  'scene_028_farewell',
  'scene_028_cut'
];

const readJson = async (filePath) => JSON.parse((await readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));

const relativeAssetPath = (assetPath) => assetPath.startsWith('public/')
  ? assetPath
  : assetPath.replace(/^\/+/, '');

const parseLabels = (raw) => {
  const lines = raw.split(/\r?\n/);
  const labels = [];

  for (const [index, line] of lines.entries()) {
    const match = line.match(/^label\s+([A-Za-z0-9_]+):/);
    if (match) {
      labels.push({ name: match[1], startLine: index + 1, endLine: lines.length, lines: [] });
    }
  }

  for (const [index, label] of labels.entries()) {
    const next = labels[index + 1];
    label.endLine = next ? next.startLine - 1 : lines.length;
    label.lines = lines.slice(label.startLine, label.endLine);
  }

  return new Map(labels.map((label) => [label.name, label]));
};

const parseLabelDetails = (label) => {
  const body = label.lines.join('\n');
  const jumps = [...body.matchAll(/^\s*jump\s+([A-Za-z0-9_]+)/gm)].map((match) => match[1]);
  const cinematics = [...body.matchAll(/^\s*cinematic\s+([A-Za-z0-9_-]+)/gm)].map((match) => match[1]);
  const hasMenu = /^\s*menu:\s*$/m.test(body);

  return {
    ...label,
    hasMenu,
    jumps,
    edges: hasMenu ? jumps : jumps.slice(-1),
    cinematics
  };
};

const enumeratePaths = (labels) => {
  const details = new Map(Array.from(labels.values()).map((label) => {
    const parsed = parseLabelDetails(label);
    return [parsed.name, parsed];
  }));
  const paths = [];
  const issues = [];

  const visit = (labelName, currentPath, currentCinematics, depth) => {
    if (depth > MAX_DEPTH) {
      issues.push(`Path exceeded max depth at ${labelName}`);
      return;
    }

    const label = details.get(labelName);
    if (!label) {
      issues.push(`Missing label target: ${labelName}`);
      return;
    }

    const nextPath = [...currentPath, labelName];
    const nextCinematics = [...currentCinematics, ...label.cinematics];

    if (labelName === TERMINAL_LABEL) {
      paths.push({ labels: nextPath, cinematics: nextCinematics, terminal: labelName });
      return;
    }

    if (label.edges.length === 0) {
      paths.push({ labels: nextPath, cinematics: nextCinematics, terminal: null });
      return;
    }

    for (const target of label.edges) {
      visit(target, nextPath, nextCinematics, depth + 1);
    }
  };

  visit(START_LABEL, [], [], 0);
  return { details, paths, issues };
};

const assetKey = (kind, id) => `${kind}:${id}`;

const main = async () => {
  const outFlagIndex = process.argv.indexOf('--out');
  const outPath = outFlagIndex === -1 ? '' : process.argv[outFlagIndex + 1] ?? '';
  const scriptManifest = await readJson(SCRIPT_MANIFEST_PATH);
  const assetManifest = await readJson(ASSET_MANIFEST_PATH);
  const rawScript = await readFile(SCRIPT_PATH, 'utf8');
  const labels = parseLabels(rawScript);
  const { details, paths, issues } = enumeratePaths(labels);
  const assetLookup = new Map(assetManifest.assets.map((asset) => [assetKey(asset.kind, asset.id), asset]));

  const allJumpTargets = Array.from(details.values()).flatMap((label) => label.jumps);
  const missingJumpTargets = allJumpTargets.filter((target) => !labels.has(target));
  const reachableLabels = new Set(paths.flatMap((candidate) => candidate.labels));
  const unreachableLabels = Array.from(labels.keys()).filter((labelName) => !reachableLabels.has(labelName));
  const terminalFailures = paths.filter((candidate) => candidate.terminal !== TERMINAL_LABEL);
  const allCinematics = Array.from(new Set(Array.from(details.values()).flatMap((label) => label.cinematics))).sort();
  const reachedCinematics = Array.from(new Set(paths.flatMap((candidate) => candidate.cinematics))).sort();
  const missingExpectedNewCgs = EXPECTED_NEW_CGS.filter((id) => !reachedCinematics.includes(id));
  const missingBranchLabels = EXPECTED_BRANCH_LABELS.filter((labelName) => !reachableLabels.has(labelName));
  const missingManifestCgs = allCinematics.filter((id) => !assetLookup.has(assetKey('cg', id)));
  const missingDiskCgs = [];

  for (const id of allCinematics) {
    const asset = assetLookup.get(assetKey('cg', id));
    if (!asset) {
      continue;
    }
    try {
      await access(path.join(ROOT, relativeAssetPath(asset.path)), constants.R_OK);
    } catch {
      missingDiskCgs.push(id);
    }
  }

  const uniquePathSignatures = new Set(paths.map((candidate) => candidate.labels.join('>')));
  const pass = Array.isArray(scriptManifest)
    && scriptManifest.length === 1
    && scriptManifest[0] === 'prologue.txt'
    && labels.has(START_LABEL)
    && labels.has(TERMINAL_LABEL)
    && paths.length === 8
    && uniquePathSignatures.size === paths.length
    && issues.length === 0
    && missingJumpTargets.length === 0
    && terminalFailures.length === 0
    && unreachableLabels.length === 0
    && missingExpectedNewCgs.length === 0
    && missingBranchLabels.length === 0
    && missingManifestCgs.length === 0
    && missingDiskCgs.length === 0;

  const report = {
    pass,
    scriptManifest,
    labelCount: labels.size,
    pathCount: paths.length,
    expectedPathCount: 8,
    allPathsReachTerminal: terminalFailures.length === 0,
    uniquePathSignatures: uniquePathSignatures.size,
    reachableLabelCount: reachableLabels.size,
    unreachableLabels,
    missingJumpTargets,
    graphIssues: issues,
    cinematicCountByPath: paths.map((candidate, index) => ({
      path: index + 1,
      labels: candidate.labels,
      cinematics: candidate.cinematics
    })),
    reachedCinematics,
    expectedNewCgs: EXPECTED_NEW_CGS,
    missingExpectedNewCgs,
    branchLabelsCovered: EXPECTED_BRANCH_LABELS.filter((labelName) => reachableLabels.has(labelName)),
    missingBranchLabels,
    missingManifestCgs,
    missingDiskCgs,
    generatedAt: new Date().toISOString()
  };

  if (outPath) {
    await mkdir(path.dirname(path.resolve(ROOT, outPath)), { recursive: true });
    await writeFile(path.resolve(ROOT, outPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(`Prologue paths: ${paths.length}/8`);
  console.log(`Labels: ${reachableLabels.size}/${labels.size} reachable`);
  console.log(`Cinematics reached: ${reachedCinematics.length}`);
  console.log(`New CG coverage: ${EXPECTED_NEW_CGS.length - missingExpectedNewCgs.length}/${EXPECTED_NEW_CGS.length}`);
  if (!pass) {
    console.log(JSON.stringify({
      missingJumpTargets,
      unreachableLabels,
      terminalFailures,
      missingExpectedNewCgs,
      missingBranchLabels,
      missingManifestCgs,
      missingDiskCgs,
      graphIssues: issues
    }, null, 2));
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
