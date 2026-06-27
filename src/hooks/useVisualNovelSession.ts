import { useCallback, useEffect, useState } from 'react';
import { INTRO_BG } from '../engine/preload';
import { DEFAULT_TRANSITION, INITIAL_VARIABLES } from '../engine/sessionConstants';
import { createEmptySaveSlots, findLatestSaveSlot, readSaveSlots } from '../engine/saveSlots';
import { loadScenarioScripts, ScenarioLoadError } from '../engine/scriptLoader';
import type { ScriptLabels } from '../engine/scriptLoader';
import {
  applyChoiceEffects,
  createSaveSlot,
  reconstructHistoryLogs,
  resolveAdvance,
  resolveLabelStart
} from '../engine/sessionRuntime';
import type { ResolveResult, SessionSnapshot } from '../engine/sessionRuntime';
import type {
  ChoiceOption,
  GameVariables,
  LogItem,
  SaveSlot,
  ScenarioCommand,
  ShownCharacters,
  VisualTransition
} from '../engine/types';
import { useAudioDirector } from './useAudioDirector';
import { useAdminNavigation } from './useAdminNavigation';

export type ActiveModal = 'save' | 'load' | 'log' | 'settings' | null;
export type GameState = 'main_menu' | 'playing';

export const useVisualNovelSession = () => {
  const [scriptLabels, setScriptLabels] = useState<ScriptLabels>({});
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('시나리오 서책을 펼치는 중...');
  const [gameState, setGameState] = useState<GameState>('main_menu');
  const [currentLabel, setCurrentLabel] = useState('scene_001');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBg, setCurrentBg] = useState(INTRO_BG);
  const [currentBgTransition, setCurrentBgTransition] = useState<VisualTransition>(DEFAULT_TRANSITION);
  const [shownCharacters, setShownCharacters] = useState<ShownCharacters>({});
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  const [cinematicIntroActive, setCinematicIntroActive] = useState(false);
  const [variables, setVariables] = useState<GameVariables>(INITIAL_VARIABLES);
  const [shownLog, setShownLog] = useState<LogItem[]>([]);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [saveSlots, setSaveSlots] = useState(createEmptySaveSlots);
  const [textSpeed, setTextSpeed] = useState(30);
  const [bgmVolume, setBgmVolume] = useState(50);
  const [sfxVolume, setSfxVolume] = useState(50);
  const [autoMode, setAutoMode] = useState(false);
  const [skipMode] = useState(false);
  const audio = useAudioDirector(bgmVolume, sfxVolume);

  const currentSnapshot = useCallback((nextVariables = variables): SessionSnapshot => ({
    variables: nextVariables,
    shownCharacters,
    activeEffects,
    currentBg,
    currentBgTransition
  }), [activeEffects, currentBg, currentBgTransition, shownCharacters, variables]);

  const commitResolvedState = useCallback((result: ResolveResult) => {
    setVariables(result.variables);
    setShownCharacters(result.shownCharacters);
    setActiveEffects([...result.activeEffects]);
    setCurrentBg(result.currentBg);
    setCurrentBgTransition(result.currentBgTransition);
    setCurrentLabel(result.currentLabel);
    setCurrentIndex(result.currentIndex);
    const logItem = result.logItem;
    if (logItem) {
      setShownLog((prev) => [...prev, logItem]);
    }
  }, []);

  const commitAdminResolvedState = useCallback((result: ResolveResult) => {
    setVariables(result.variables);
    setShownCharacters(result.shownCharacters);
    setActiveEffects([...result.activeEffects]);
    setCurrentBg(result.currentBg);
    setCurrentBgTransition(result.currentBgTransition);
    setCurrentLabel(result.currentLabel);
    setCurrentIndex(result.currentIndex);
    setShownLog(result.logItem ? [result.logItem] : []);
  }, []);

  const prepareAdminJump = useCallback(() => {
    audio.unlockAudio();
    audio.stopMusic();
    audio.stopSound();
    setActiveModal(null);
    setCinematicIntroActive(false);
    setGameState('playing');
  }, [audio]);

  useEffect(() => {
    let cancelled = false;
    const loadScripts = async () => {
      try {
        const labels = await loadScenarioScripts(setLoadingMessage);
        if (cancelled) return;
        setScriptLabels(labels);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        if (!(error instanceof ScenarioLoadError)) {
          throw error;
        }
        setLoadingMessage(`시나리오를 불러오지 못했습니다: ${error.message}`);
        setLoading(false);
      }
    };
    loadScripts();
    setSaveSlots(readSaveSlots());
    return () => {
      cancelled = true;
    };
  }, []);

  const runLabelStart = useCallback((
    label: string,
    snapshot: SessionSnapshot
  ) => commitResolvedState(resolveLabelStart(scriptLabels, label, snapshot, audio)), [
    audio,
    commitResolvedState,
    scriptLabels
  ]);

  const handleStartGame = () => {
    audio.unlockAudio();
    setShownLog([]);
    setCinematicIntroActive(true);
    setGameState('playing');
    runLabelStart('scene_001', {
      variables: INITIAL_VARIABLES,
      shownCharacters: {},
      activeEffects: [],
      currentBg: '',
      currentBgTransition: DEFAULT_TRANSITION
    });
  };

  const handleAdvance = () => {
    const commands = scriptLabels[currentLabel];
    if (!commands || currentIndex >= commands.length || commands[currentIndex].type === 'menu') return;
    commitResolvedState(resolveAdvance(
      scriptLabels,
      currentLabel,
      currentIndex,
      currentSnapshot(),
      audio
    ));
  };

  const handleChoiceSelected = (option: ChoiceOption) => {
    const nextVariables = applyChoiceEffects(variables, option);
    setShownLog((prev) => [...prev, { speaker: '선택', text: `> ${option.text}` }]);
    runLabelStart(option.jumpLabel, {
      ...currentSnapshot(nextVariables),
      activeEffects: activeEffects.includes('snow') ? ['snow'] : []
    });
  };

  const loadSaveSlot = (slot: SaveSlot) => {
    setVariables(slot.variables);
    setShownCharacters(slot.shownCharacters);
    setCurrentBg(slot.currentBg);
    setCurrentBgTransition(slot.currentBgTransition || DEFAULT_TRANSITION);
    setActiveEffects(slot.activeEffects);
    setCurrentLabel(slot.currentLabel);
    setCurrentIndex(slot.currentIndex);
    setCinematicIntroActive(false);
    setGameState('playing');
    setActiveModal(null);
    setShownLog([...reconstructHistoryLogs(scriptLabels, slot)]);
  };

  const handleContinue = () => {
    const latestSlot = findLatestSaveSlot(saveSlots);
    if (latestSlot) {
      audio.unlockAudio();
      loadSaveSlot(latestSlot);
    }
  };

  const handleSaveSlot = (slotId: number) => {
    const newSave = createSaveSlot(slotId, scriptLabels, currentSnapshot(), currentLabel, currentIndex);
    localStorage.setItem(`yeokgwi_save_slot_${slotId}`, JSON.stringify(newSave));
    setSaveSlots((prev) => ({ ...prev, [slotId]: newSave }));
    setActiveModal(null);
  };

  const handleLoadSlot = (slotId: number) => {
    const slot = saveSlots[slotId];
    if (slot) {
      audio.unlockAudio();
      loadSaveSlot(slot);
    }
  };

  const adminNavigation = useAdminNavigation({
    commitResolvedState: commitAdminResolvedState,
    currentIndex,
    currentLabel,
    labels: scriptLabels,
    prepareJump: prepareAdminJump,
    variables
  });

  const activeCommands = scriptLabels[currentLabel] || [];
  const isAtLabelEnd = gameState === 'playing' && activeCommands.length > 0 && currentIndex >= activeCommands.length;
  const labelEndCommand: ScenarioCommand | null = isAtLabelEnd
    ? (activeCommands.slice().reverse().find((cmd) => (
      cmd.type === 'dialogue' || cmd.type === 'narration'
    )) || null)
    : null;
  const currentCommand = activeCommands[currentIndex] || labelEndCommand;
  const displayCommand = currentCommand?.type === 'menu'
    ? (activeCommands.slice(0, currentIndex).reverse().find((cmd) => (
      cmd.type === 'dialogue' || cmd.type === 'narration'
    )) || currentCommand)
    : currentCommand;

  return {
    activeEffects,
    activeModal,
    autoMode,
    bgmVolume,
    cinematicIntroActive,
    currentBg,
    currentBgTransition,
    currentCommand,
    currentIndex,
    currentLabel,
    displayCommand,
    gameState,
    handleAdvance,
    handleChoiceSelected,
    handleContinue,
    handleLoadSlot,
    handleSaveSlot,
    handleStartGame,
    hasSaves: Object.values(saveSlots).some((slot) => slot !== null),
    jumpByAdminDialogueOffset: adminNavigation.jumpByAdminDialogueOffset,
    jumpByAdminOffset: adminNavigation.jumpByAdminOffset,
    jumpToLabelForAdmin: adminNavigation.jumpToLabelForAdmin,
    loading,
    loadingMessage,
    saveSlots,
    scriptLabels,
    setActiveModal,
    setAutoMode,
    setBgmVolume,
    setCinematicIntroActive,
    setGameState,
    setSfxVolume,
    setTextSpeed,
    sfxVolume,
    shownCharacters,
    shownLog,
    skipMode,
    stopMusic: audio.stopMusic,
    textSpeed
  };
};
