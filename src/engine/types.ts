export type ExpressionType = 'neutral' | 'alert' | 'anxious' | 'protect';

export type VisualTransition =
  | 'none'
  | 'dissolve'
  | 'fade'
  | 'moveinleft'
  | 'moveinright'
  | 'moveoutleft'
  | 'moveoutright'
  | 'ease'
  | 'hpunch'
  | 'vpunch'
  | 'flash'
  | 'flash-red'
  | 'flash-white';

export type CharacterPosition = 'left' | 'center' | 'right';

export interface CharacterVisualState {
  readonly expression: string;
  readonly position: CharacterPosition;
  readonly transition: VisualTransition;
}

export type CharacterDisplay = string | CharacterVisualState;

export interface ShownCharacters {
  [charId: string]: CharacterDisplay;
}

export type CommandType =
  | 'label'
  | 'scene'
  | 'cinematic'
  | 'show'
  | 'hide'
  | 'play_music'
  | 'play_sound'
  | 'stop_music'
  | 'stop_sound'
  | 'effect'
  | 'variable'
  | 'menu'
  | 'jump'
  | 'dialogue'
  | 'narration';

export interface VariableChange {
  name: string;
  op: '=' | '+=' | '-=';
  value: number;
}

export interface ChoiceOption {
  text: string;
  effects: VariableChange[];
  jumpLabel: string;
}

export interface ScenarioCommand {
  type: CommandType;
  rawLine: string;
  lineNum: number;
  
  // Specific command payloads
  labelName?: string;
  bgId?: string;
  cgId?: string;
  charId?: string;
  expression?: string;
  position?: CharacterPosition;
  transition?: VisualTransition;
  effectId?: string;
  audioId?: string;
  varChange?: VariableChange;
  text?: string;
  speaker?: string;
  options?: ChoiceOption[];
  jumpLabel?: string;
}

export interface GameVariables {
  trust_girl: number;
  humanity: number;
  suspicion: number;
  truth: number;
  plague_resonance: number;
  authority_alert: number;
  food: number;
  medicine: number;
  daughter_attachment: number;
  allies: number;
  [key: string]: number; // Allow dynamic access
}

export interface SaveSlot {
  id: number;
  date: string;
  chapter: string;
  sceneTitle: string;
  lineText: string;
  variables: GameVariables;
  currentLabel: string;
  currentIndex: number;
  shownCharacters: ShownCharacters;
  currentBgTransition?: VisualTransition;
  currentBg: string;
  activeEffects: string[];
}

export interface LogItem {
  speaker: string; // "이현", "소녀", "장덕팔", "나레이션" 등
  text: string;
}

export const assertNever = (value: never): never => {
  throw new Error(`Unhandled variant: ${String(value)}`);
};

export const CHARACTER_MAP: { [name: string]: string } = {
  '?λ뜒??': 'dp',
  '?댄쁽': 'ih',
  '?뷀뼢': 'wh',
  '?쒗븯': 'sh',
  '이현': 'ih',
  '소녀': 'sh',
  '서하': 'sh',
  '소녀 서하': 'sh',
  '장덕팔': 'dp',
  '덕팔': 'dp',
  '서연화': 'yh',
  '의원': 'yh',
  '공덕': 'gd',
  '월향': 'wh',
  '만신': 'wh',
  '박무겸': 'mg',
  '강초석': 'cs',
  '백리향': 'lh_kiseang',
  '유복': 'yb',
  '홍연': 'hy',
  '점돌': 'jd',
  '능월': 'nw',
  '심원직': 'wj',
  '윤치겸': 'cg',
  '민종서': 'js',
  '다치바나 료헤이': 'tb',
  '다치바나': 'tb',
  '사에키 겐고': 'sk',
  '사에키': 'sk',
  '하운': 'hu',
  '한시령': 'sr',
  '역귀': 'yg',
  '좀비': 'yg'
};
