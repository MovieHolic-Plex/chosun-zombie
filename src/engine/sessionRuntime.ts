import { getDefaultPosition } from './visuals';
import { DEFAULT_TRANSITION } from './sessionConstants';
import { assertNever } from './types';
import type {
  ChoiceOption,
  GameVariables,
  LogItem,
  SaveSlot,
  ScenarioCommand,
  ShownCharacters,
  VisualTransition
} from './types';
import type { ScriptLabels } from './scriptLoader';

export interface AudioRuntime {
  readonly playMusic: (audioId: string) => void;
  readonly playSound: (audioId: string) => void;
  readonly stopMusic: () => void;
  readonly stopSound: () => void;
}

export interface SessionSnapshot {
  readonly variables: GameVariables;
  readonly shownCharacters: ShownCharacters;
  readonly activeEffects: readonly string[];
  readonly currentBg: string;
  readonly currentBgTransition: VisualTransition;
}

export interface ResolveResult extends SessionSnapshot {
  readonly currentLabel: string;
  readonly currentIndex: number;
  readonly logItem: LogItem | null;
}

interface MutableBgState {
  bg: string;
  transition: VisualTransition;
}

const snowOnly = (effects: readonly string[]): string[] => (
  effects.includes('snow') ? ['snow'] : []
);

export const createLogItem = (cmd: ScenarioCommand): LogItem | null => {
  if (cmd.type === 'dialogue') {
    return { speaker: cmd.speaker || '알수없음', text: cmd.text || '' };
  }
  if (cmd.type === 'narration') {
    return { speaker: '나레이션', text: cmd.text || '' };
  }
  return null;
};

const executeCommand = (
  cmd: ScenarioCommand,
  variables: GameVariables,
  chars: ShownCharacters,
  effects: string[],
  bgState: MutableBgState,
  audio: AudioRuntime
) => {
  switch (cmd.type) {
    case 'scene':
      if (cmd.bgId) {
        if (cmd.bgId !== bgState.bg) {
          bgState.bg = cmd.bgId;
          bgState.transition = cmd.transition || DEFAULT_TRANSITION;
        }
        Object.keys(chars).forEach((charId) => {
          delete chars[charId];
        });
        effects.length = 0;
      }
      break;
    case 'cinematic':
      if (cmd.cgId) {
        bgState.bg = `cg:${cmd.cgId}`;
        bgState.transition = cmd.transition || 'fade';
        Object.keys(chars).forEach((charId) => {
          delete chars[charId];
        });
        effects.length = 0;
      }
      break;
    case 'show':
      if (cmd.charId) {
        chars[cmd.charId] = {
          expression: cmd.expression || 'neutral',
          position: cmd.position || getDefaultPosition(cmd.charId),
          transition: cmd.transition || DEFAULT_TRANSITION
        };
      }
      break;
    case 'hide':
      if (cmd.charId) {
        delete chars[cmd.charId];
      }
      break;
    case 'effect':
      if (cmd.effectId && !effects.includes(cmd.effectId)) {
        effects.push(cmd.effectId);
      }
      break;
    case 'variable':
      if (cmd.varChange) {
        const { name, op, value } = cmd.varChange;
        const currentVal = variables[name] || 0;
        if (op === '=') variables[name] = value;
        if (op === '+=') variables[name] = currentVal + value;
        if (op === '-=') variables[name] = currentVal - value;
      }
      break;
    case 'play_music':
      if (cmd.audioId) audio.playMusic(cmd.audioId);
      break;
    case 'play_sound':
      if (cmd.audioId) audio.playSound(cmd.audioId);
      break;
    case 'stop_music':
      audio.stopMusic();
      break;
    case 'stop_sound':
      audio.stopSound();
      break;
    case 'label':
    case 'menu':
    case 'jump':
    case 'dialogue':
    case 'narration':
      break;
    default:
      assertNever(cmd.type);
  }
};

const resolveCommandsFrom = (
  labels: ScriptLabels,
  startLabel: string,
  startIndex: number,
  snapshot: SessionSnapshot,
  audio: AudioRuntime
): ResolveResult => {
  let currentLabel = startLabel;
  let index = startIndex;
  const variables = { ...snapshot.variables };
  const shownCharacters = { ...snapshot.shownCharacters };
  const activeEffects = snowOnly(snapshot.activeEffects);
  const bgState = {
    bg: snapshot.currentBg,
    transition: snapshot.currentBgTransition
  };

  for (let guard = 0; guard < 1000; guard++) {
    const commands = labels[currentLabel];
    if (!commands || index >= commands.length) break;
    const cmd = commands[index];
    if (cmd.type === 'jump') {
      currentLabel = cmd.jumpLabel || currentLabel;
      index = 0;
      continue;
    }
    if (cmd.type === 'dialogue' || cmd.type === 'narration' || cmd.type === 'menu') {
      return {
        variables,
        shownCharacters,
        activeEffects,
        currentBg: bgState.bg,
        currentBgTransition: bgState.transition,
        currentLabel,
        currentIndex: index,
        logItem: createLogItem(cmd)
      };
    }
    executeCommand(cmd, variables, shownCharacters, activeEffects, bgState, audio);
    index++;
  }

  return {
    variables,
    shownCharacters,
    activeEffects,
    currentBg: bgState.bg,
    currentBgTransition: bgState.transition,
    currentLabel,
    currentIndex: index,
    logItem: null
  };
};

export const resolveLabelStart = (
  labels: ScriptLabels,
  label: string,
  snapshot: SessionSnapshot,
  audio: AudioRuntime
): ResolveResult => resolveCommandsFrom(labels, label, 0, snapshot, audio);

export const resolveAdvance = (
  labels: ScriptLabels,
  label: string,
  index: number,
  snapshot: SessionSnapshot,
  audio: AudioRuntime
): ResolveResult => resolveCommandsFrom(labels, label, index + 1, snapshot, audio);

export const applyChoiceEffects = (
  variables: GameVariables,
  option: ChoiceOption
): GameVariables => {
  const nextVariables = { ...variables };
  option.effects.forEach((effect) => {
    const currentVal = nextVariables[effect.name] || 0;
    if (effect.op === '=') nextVariables[effect.name] = effect.value;
    if (effect.op === '+=') nextVariables[effect.name] = currentVal + effect.value;
    if (effect.op === '-=') nextVariables[effect.name] = currentVal - effect.value;
  });
  return nextVariables;
};

export const createSaveSlot = (
  slotId: number,
  labels: ScriptLabels,
  snapshot: SessionSnapshot,
  currentLabel: string,
  currentIndex: number
): SaveSlot => {
  const currentCmd = labels[currentLabel]?.[currentIndex] || null;
  const lineText = currentCmd?.text || currentCmd?.rawLine || '';
  return {
    id: slotId,
    date: new Date().toLocaleString('ko-KR'),
    chapter: currentLabel.startsWith('scene_01') ? '1장: 버려진 주막의 밤' : '프롤로그: 눈 내린 고갯길',
    sceneTitle: currentCmd?.type === 'dialogue' ? `${currentCmd.speaker}의 말` : '고갯길 피바람',
    lineText: lineText.length > 50 ? `${lineText.substring(0, 50)}...` : lineText,
    variables: snapshot.variables,
    currentLabel,
    currentIndex,
    shownCharacters: snapshot.shownCharacters,
    currentBg: snapshot.currentBg,
    currentBgTransition: snapshot.currentBgTransition,
    activeEffects: [...snapshot.activeEffects]
  };
};

export const reconstructHistoryLogs = (
  labels: ScriptLabels,
  slot: SaveSlot
): readonly LogItem[] => {
  const command = labels[slot.currentLabel]?.[slot.currentIndex];
  const logItem = command ? createLogItem(command) : null;
  return logItem ? [logItem] : [];
};
