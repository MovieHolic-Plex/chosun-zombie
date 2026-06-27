import { INTRO_BG } from './preload';
import { DEFAULT_TRANSITION } from './sessionConstants';
import { resolveAdvance, resolveLabelStart } from './sessionRuntime';
import type { AudioRuntime, ResolveResult, SessionSnapshot } from './sessionRuntime';
import type { ScriptLabels } from './scriptLoader';
import type { GameVariables, ScenarioCommand } from './types';

export const ADMIN_DIALOGUE_SKIP_STEP = 10;
export const ADMIN_SCENE_SKIP_STEP = 10;

interface AdminBaseRequest {
  readonly labels: ScriptLabels;
  readonly variables: GameVariables;
}

interface AdminLabelJumpRequest extends AdminBaseRequest {
  readonly label: string;
}

interface AdminSceneJumpRequest extends AdminBaseRequest {
  readonly currentLabel: string;
  readonly offset: number;
}

interface AdminDialogueJumpRequest extends AdminBaseRequest {
  readonly currentIndex: number;
  readonly currentLabel: string;
  readonly offset: number;
}

interface AdminDialogueAnchor {
  readonly index: number;
  readonly label: string;
}

const SILENT_AUDIO: AudioRuntime = {
  playMusic: () => {},
  playSound: () => {},
  stopMusic: () => {},
  stopSound: () => {}
};

const clampIndex = (value: number, max: number): number => Math.min(Math.max(value, 0), max);

const createAdminSnapshot = (variables: GameVariables): SessionSnapshot => ({
  activeEffects: [],
  currentBg: INTRO_BG,
  currentBgTransition: DEFAULT_TRANSITION,
  shownCharacters: {},
  variables
});

const getOrderedSceneLabels = (labels: ScriptLabels): readonly string[] => (
  Object.keys(labels).filter((label) => label.startsWith('scene_'))
);

const isDialogueAnchor = (command: ScenarioCommand): boolean => (
  command.type === 'dialogue' || command.type === 'narration' || command.type === 'menu'
);

const collectDialogueAnchors = (labels: ScriptLabels): readonly AdminDialogueAnchor[] => (
  getOrderedSceneLabels(labels).flatMap((label) => {
    const commands = labels[label] || [];
    return commands.flatMap((command, index) => (
      isDialogueAnchor(command) ? [{ index, label }] : []
    ));
  })
);

const findCurrentAnchorPosition = (
  anchors: readonly AdminDialogueAnchor[],
  currentLabel: string,
  currentIndex: number
): number => {
  let previousInLabel = -1;
  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    if (anchor.label === currentLabel && anchor.index <= currentIndex) {
      previousInLabel = index;
    }
    if (anchor.label === currentLabel && anchor.index === currentIndex) {
      return index;
    }
  }

  if (previousInLabel >= 0) return previousInLabel;

  const firstInLabel = anchors.findIndex((anchor) => anchor.label === currentLabel);
  return firstInLabel >= 0 ? firstInLabel : 0;
};

const resolveDialogueAnchor = (
  request: AdminBaseRequest,
  target: AdminDialogueAnchor
): ResolveResult | null => {
  let result = resolveLabelStart(
    request.labels,
    target.label,
    createAdminSnapshot(request.variables),
    SILENT_AUDIO
  );

  for (let guard = 0; guard < 1000; guard += 1) {
    if (result.currentLabel === target.label && result.currentIndex === target.index) {
      return result;
    }

    result = resolveAdvance(
      request.labels,
      result.currentLabel,
      result.currentIndex,
      result,
      SILENT_AUDIO
    );
  }

  return null;
};

export const resolveAdminLabelJump = (request: AdminLabelJumpRequest): ResolveResult | null => {
  if (!request.labels[request.label]) return null;
  return resolveLabelStart(
    request.labels,
    request.label,
    createAdminSnapshot(request.variables),
    SILENT_AUDIO
  );
};

export const resolveAdminSceneJump = (request: AdminSceneJumpRequest): ResolveResult | null => {
  const orderedLabels = getOrderedSceneLabels(request.labels);
  const currentPosition = Math.max(orderedLabels.indexOf(request.currentLabel), 0);
  const targetPosition = clampIndex(currentPosition + request.offset, orderedLabels.length - 1);
  const targetLabel = orderedLabels[targetPosition];
  return targetLabel
    ? resolveAdminLabelJump({ labels: request.labels, label: targetLabel, variables: request.variables })
    : null;
};

export const resolveAdminDialogueJump = (
  request: AdminDialogueJumpRequest
): ResolveResult | null => {
  const anchors = collectDialogueAnchors(request.labels);
  if (anchors.length === 0) return null;

  const currentPosition = findCurrentAnchorPosition(
    anchors,
    request.currentLabel,
    request.currentIndex
  );
  const targetPosition = clampIndex(currentPosition + request.offset, anchors.length - 1);
  return resolveDialogueAnchor(request, anchors[targetPosition]);
};
