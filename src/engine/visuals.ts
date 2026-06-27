import { CHARACTER_MAP } from './types';
import type { CharacterDisplay, CharacterPosition, VisualTransition } from './types';

export interface ResolvedCharacterVisual {
  readonly charId: string;
  readonly characterCode: string;
  readonly expression: string;
  readonly position: CharacterPosition;
  readonly transition: VisualTransition;
  readonly imageUrl: string;
  readonly imageKey: string;
}

export type SpritePhase = 'enter' | 'exit';

export interface RenderedSprite extends ResolvedCharacterVisual {
  readonly renderKey: string;
  readonly phase: SpritePhase;
}

export const getBgUrl = (bgId: string): string => {
  if (bgId.startsWith('cg:')) {
    return `/assets/cg/${bgId.substring(3)}.png`;
  }

  return `/assets/bg/${bgId}.png`;
};

export const getCharacterCode = (charId: string): string => CHARACTER_MAP[charId] || 'sh';

export const getCharacterUrl = (charId: string, expression: string): string => {
  const filename = `${getCharacterCode(charId)}_${expression.toLowerCase()}.png`;
  return `/assets/char/${filename}`;
};

export const getDefaultPosition = (charId: string): CharacterPosition => {
  if (charId === '이현') return 'left';
  if (charId === '서하' || charId === '소녀') return 'right';
  if (charId === '장덕팔') return 'right';
  return 'center';
};

export const resolveCharacterVisual = (
  charId: string,
  display: CharacterDisplay
): ResolvedCharacterVisual => {
  const visual = typeof display === 'string'
    ? {
        expression: display,
        position: getDefaultPosition(charId),
        transition: 'dissolve' as const
      }
    : display;

  const expression = visual.expression.toLowerCase();
  const position = visual.position;
  const transition = visual.transition;
  const characterCode = getCharacterCode(charId);
  const imageUrl = `/assets/char/${characterCode}_${expression}.png`;

  return {
    charId,
    characterCode,
    expression,
    position,
    transition,
    imageUrl,
    imageKey: `${charId}:${expression}:${position}`
  };
};

export const createRenderedSprite = (
  visual: ResolvedCharacterVisual,
  phase: SpritePhase,
  sequence: number
): RenderedSprite => ({
  ...visual,
  phase,
  renderKey: `${visual.imageKey}:${phase}:${sequence}`
});
