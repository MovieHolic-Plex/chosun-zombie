import type { GameVariables, VisualTransition } from './types';

export const INITIAL_VARIABLES: GameVariables = {
  trust_girl: 0,
  humanity: 0,
  suspicion: 0,
  truth: 0,
  plague_resonance: 0,
  authority_alert: 0,
  food: 5,
  medicine: 3,
  daughter_attachment: 0,
  allies: 0
};

export const DEFAULT_TRANSITION: VisualTransition = 'dissolve';

export const ADMIN_SKIP_TARGETS = [
  { label: 'scene_001', name: '프롤로그' },
  { label: 'scene_034', name: '초소 붕괴' },
  { label: 'scene_101', name: '1장' },
  { label: 'scene_121', name: '2장' },
  { label: 'scene_141', name: '3장' },
  { label: 'scene_160', name: '엔딩' }
] as const;
