import type {
  CharacterPosition,
  ScenarioCommand,
  VariableChange,
  VisualTransition
} from './types';

interface TransitionHint {
  readonly body: string;
  readonly transition?: VisualTransition;
}

interface PositionHint {
  readonly body: string;
  readonly position?: CharacterPosition;
}

function parseTransition(value: string): VisualTransition | undefined {
  switch (value) {
    case 'none':
    case 'dissolve':
    case 'fade':
    case 'moveinleft':
    case 'moveinright':
    case 'moveoutleft':
    case 'moveoutright':
    case 'ease':
    case 'hpunch':
    case 'vpunch':
    case 'flash':
    case 'flash-red':
    case 'flash-white':
      return value;
    default:
      return undefined;
  }
}

function parsePosition(value: string): CharacterPosition | undefined {
  switch (value) {
    case 'left':
    case 'center':
    case 'right':
      return value;
    default:
      return undefined;
  }
}

function splitTransitionHint(input: string): TransitionHint {
  const match = input.match(/^(.*)\s+with\s+([a-zA-Z0-9_-]+)$/);
  if (!match) {
    return { body: input };
  }

  const transition = parseTransition(match[2]);
  if (!transition) {
    return { body: input };
  }

  return {
    body: match[1].trim(),
    transition
  };
}

function splitPositionHint(input: string): PositionHint {
  const match = input.match(/^(.*)\s+at\s+(left|center|right)$/);
  if (!match) {
    return { body: input };
  }

  const position = parsePosition(match[2]);
  if (!position) {
    return { body: input };
  }

  return {
    body: match[1].trim(),
    position
  };
}

function parseVariableOperator(value: string): VariableChange['op'] | undefined {
  switch (value) {
    case '=':
    case '+=':
    case '-=':
      return value;
    default:
      return undefined;
  }
}

export function parseVariableChange(line: string): VariableChange | undefined {
  const expr = line.replace(/^\$\s*/, '').trim();
  const match = expr.match(/^([a-zA-Z0-9_]+)\s*(\+=|-=|=)\s*(-?\d+)$/);

  if (match) {
    const op = parseVariableOperator(match[2]);
    if (!op) {
      return undefined;
    }

    return {
      name: match[1],
      op,
      value: parseInt(match[3], 10)
    };
  }
  return undefined;
}

export function parseLineCommand(
  trimmed: string,
  rawLine: string,
  lineNum: number
): ScenarioCommand | undefined {
  if (trimmed.startsWith('scene bg ')) {
    const hint = splitTransitionHint(trimmed);
    return {
      type: 'scene',
      rawLine,
      lineNum,
      bgId: hint.body.substring(9).trim(),
      transition: hint.transition
    };
  }

  if (trimmed.startsWith('cinematic ')) {
    const hint = splitTransitionHint(trimmed);
    return {
      type: 'cinematic',
      rawLine,
      lineNum,
      cgId: hint.body.substring(10).trim(),
      transition: hint.transition
    };
  }

  if (trimmed.startsWith('show char ')) {
    const transitionHint = splitTransitionHint(trimmed);
    const positionHint = splitPositionHint(transitionHint.body);
    const body = positionHint.body.substring(10).trim();
    const match = body.match(/^(.*?)(?:\s+([a-zA-Z0-9_]+))?$/);
    return {
      type: 'show',
      rawLine,
      lineNum,
      charId: match?.[1]?.trim() || body,
      expression: match?.[2] || 'neutral',
      position: positionHint.position,
      transition: transitionHint.transition
    };
  }

  if (trimmed.startsWith('hide char ')) {
    const hint = splitTransitionHint(trimmed);
    return {
      type: 'hide',
      rawLine,
      lineNum,
      charId: hint.body.substring(10).trim(),
      transition: hint.transition
    };
  }

  if (trimmed.startsWith('show effect ')) {
    return {
      type: 'effect',
      rawLine,
      lineNum,
      effectId: trimmed.substring(12).trim()
    };
  }

  if (trimmed.startsWith('play music ')) {
    return {
      type: 'play_music',
      rawLine,
      lineNum,
      audioId: trimmed.substring(11).trim()
    };
  }
  if (trimmed.startsWith('play sound ')) {
    return {
      type: 'play_sound',
      rawLine,
      lineNum,
      audioId: trimmed.substring(11).trim()
    };
  }
  if (trimmed === 'stop music') {
    return {
      type: 'stop_music',
      rawLine,
      lineNum
    };
  }
  if (trimmed === 'stop sound') {
    return {
      type: 'stop_sound',
      rawLine,
      lineNum
    };
  }

  if (trimmed.startsWith('jump ')) {
    return {
      type: 'jump',
      rawLine,
      lineNum,
      jumpLabel: trimmed.substring(5).trim()
    };
  }

  if (trimmed.startsWith('$')) {
    const varChange = parseVariableChange(trimmed);
    if (varChange) {
      return {
        type: 'variable',
        rawLine,
        lineNum,
        varChange
      };
    }
  }

  const diagWithExprMatch = trimmed.match(/^(?:"([^"]+)"|([^\s"]+))\s+([a-zA-Z0-9_가-힣]+)\s+"([^"]+)"$/);
  if (diagWithExprMatch) {
    return {
      type: 'dialogue',
      rawLine,
      lineNum,
      speaker: diagWithExprMatch[1] || diagWithExprMatch[2],
      expression: diagWithExprMatch[3],
      text: diagWithExprMatch[4]
    };
  }

  const diagMatch = trimmed.match(/^(?:"([^"]+)"|([^\s"]+))\s+"([^"]+)"$/);
  if (diagMatch) {
    return {
      type: 'dialogue',
      rawLine,
      lineNum,
      speaker: diagMatch[1] || diagMatch[2],
      expression: 'neutral',
      text: diagMatch[3]
    };
  }

  const narrMatch = trimmed.match(/^"([^"]+)"$/);
  if (narrMatch) {
    return {
      type: 'narration',
      rawLine,
      lineNum,
      text: narrMatch[1]
    };
  }

  return undefined;
}
