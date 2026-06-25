import { useCallback, useState, useEffect } from 'react';
import { parseScript } from './engine/parser';
import type {
  ChoiceOption,
  GameVariables,
  LogItem,
  SaveSlot,
  ScenarioCommand,
  ShownCharacters,
  VisualTransition
} from './engine/types';
import { getDefaultPosition } from './engine/visuals';
import { Visuals } from './components/Visuals';
import { CinematicIntro } from './components/CinematicIntro';
import { DialogueBox } from './components/DialogueBox';
import { MainMenu } from './components/MainMenu';
import { SaveLoadModal } from './components/SaveLoadModal';
import { LogModal } from './components/LogModal';
import { SettingsModal } from './components/SettingsModal';
import {
  CRITICAL_INTRO_ASSETS,
  INTRO_BG,
  STORY_IMAGE_ASSETS,
  preloadImages
} from './engine/preload';
import { useAudioDirector } from './hooks/useAudioDirector';

const INITIAL_VARIABLES: GameVariables = {
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

const DEFAULT_TRANSITION: VisualTransition = 'dissolve';

export default function App() {
  // Scenario Data
  const [scriptLabels, setScriptLabels] = useState<{ [label: string]: ScenarioCommand[] }>({});
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('시나리오 서책을 펼치는 중...');

  // Navigation State
  const [gameState, setGameState] = useState<'main_menu' | 'playing'>('main_menu');
  const [currentLabel, setCurrentLabel] = useState('scene_001');
  const [currentIndex, setCurrentIndex] = useState(0);

  // visual state
  const [currentBg, setCurrentBg] = useState(INTRO_BG);
  const [currentBgTransition, setCurrentBgTransition] = useState<VisualTransition>(DEFAULT_TRANSITION);
  const [shownCharacters, setShownCharacters] = useState<ShownCharacters>({});
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  const [cinematicIntroActive, setCinematicIntroActive] = useState(false);

  // Variables and log
  const [variables, setVariables] = useState<GameVariables>(INITIAL_VARIABLES);
  const [shownLog, setShownLog] = useState<LogItem[]>([]);

  // Modals
  const [activeModal, setActiveModal] = useState<'save' | 'load' | 'log' | 'settings' | null>(null);
  const [saveSlots, setSaveSlots] = useState<{ [slotId: number]: SaveSlot | null }>({
    1: null, 2: null, 3: null, 4: null
  });

  // Settings
  const [textSpeed, setTextSpeed] = useState(30);
  const [bgmVolume, setBgmVolume] = useState(50);
  const [sfxVolume, setSfxVolume] = useState(50);
  const [autoMode, setAutoMode] = useState(false);
  const [skipMode] = useState(false);
  const {
    unlockAudio,
    playMusic,
    stopMusic,
    playSound,
    stopSound
  } = useAudioDirector(bgmVolume, sfxVolume);

  // Fetch and Parse Scripts on Mount
  useEffect(() => {
    let cancelled = false;

    const loadScripts = async () => {
      try {
        setLoadingMessage('시나리오 서책을 펼치는 중...');
        const [prologueRes, ch1Res] = await Promise.all([
          fetch('/scripts/prologue.txt'),
          fetch('/scripts/chapter01.txt')
        ]);
        const [prologueText, ch1Text] = await Promise.all([
          prologueRes.text(),
          ch1Res.text()
        ]);

        const prologueLabels = parseScript(prologueText);
        const ch1Labels = parseScript(ch1Text);

        const mergedLabels = { ...prologueLabels, ...ch1Labels };
        setLoadingMessage('첫 장면의 그림자를 준비하는 중...');
        await preloadImages(CRITICAL_INTRO_ASSETS, { timeoutMs: 5000 });
        if (cancelled) return;
        setScriptLabels(mergedLabels);
        setLoading(false);
        void preloadImages(STORY_IMAGE_ASSETS, { timeoutMs: 9000 });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error) {
          console.error('Failed to load visual novel scripts:', err.message);
        } else {
          console.error('Failed to load visual novel scripts:', String(err));
        }
        setLoading(false);
      }
    };

    loadScripts();

    // Load save slots from localStorage
    const loadedSlots: { [slotId: number]: SaveSlot | null } = { 1: null, 2: null, 3: null, 4: null };
    for (let i = 1; i <= 4; i++) {
      const savedData = localStorage.getItem(`yeokgwi_save_slot_${i}`);
      if (savedData) {
        try {
          loadedSlots[i] = JSON.parse(savedData);
        } catch (e) {
          console.error(`Failed to parse save slot ${i}:`, e);
        }
      }
    }
    setSaveSlots(loadedSlots);

    return () => {
      cancelled = true;
    };
  }, []);

  const hasSaves = Object.values(saveSlots).some((s) => s !== null);
  const handleCinematicIntroComplete = useCallback(() => {
    setCinematicIntroActive(false);
  }, []);

  // Scaler state and effect for responsive mobile landscape layout
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 1280;
      const scaleY = window.innerHeight / 720;
      // Fit inside window bounds
      setScale(Math.min(scaleX, scaleY));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Execute an AST command
  const executeCommand = (
    cmd: ScenarioCommand,
    varsState: GameVariables,
    charsState: ShownCharacters,
    effectsState: string[],
    bgState: { bg: string; transition: VisualTransition }
  ) => {
    switch (cmd.type) {
      case 'scene':
        if (cmd.bgId) {
          if (cmd.bgId !== bgState.bg) {
            bgState.bg = cmd.bgId;
            bgState.transition = cmd.transition || DEFAULT_TRANSITION;
          }
          Object.keys(charsState).forEach((charId) => {
            delete charsState[charId];
          });
          effectsState.length = 0;
        }
        break;
      case 'show':
        if (cmd.charId) {
          charsState[cmd.charId] = {
            expression: cmd.expression || 'neutral',
            position: cmd.position || getDefaultPosition(cmd.charId),
            transition: cmd.transition || DEFAULT_TRANSITION
          };
        }
        break;
      case 'hide':
        if (cmd.charId) {
          delete charsState[cmd.charId];
        }
        break;
      case 'effect':
        if (cmd.effectId) {
          // If transient effect (like shake/flash), we add it (it will animate once).
          // Continuous effects (like snow) are kept.
          if (!effectsState.includes(cmd.effectId)) {
            effectsState.push(cmd.effectId);
          }
        }
        break;
      case 'variable':
        if (cmd.varChange) {
          const { name, op, value } = cmd.varChange;
          const currentVal = varsState[name] || 0;
          if (op === '=') {
            varsState[name] = value;
          } else if (op === '+=') {
            varsState[name] = currentVal + value;
          } else if (op === '-=') {
            varsState[name] = currentVal - value;
          }
        }
        break;
      case 'play_music':
        if (cmd.audioId) {
          playMusic(cmd.audioId);
        }
        break;
      case 'play_sound':
        if (cmd.audioId) {
          playSound(cmd.audioId);
        }
        break;
      case 'stop_music':
        stopMusic();
        break;
      case 'stop_sound':
        stopSound();
        break;
      default:
        break;
    }
  };

  // Run initial commands when entering a label
  const runInitialCommands = (
    labels: { [label: string]: ScenarioCommand[] },
    labelName: string,
    vars: GameVariables,
    chars: ShownCharacters,
    effects: string[],
    bg: string
  ) => {
    const commands = labels[labelName];
    if (!commands || commands.length === 0) return;

    let index = 0;
    const nextVars = { ...vars };
    const nextChars = { ...chars };
    
    // Maintain snow effect if it's set
    const nextEffects = effects.includes('snow') ? ['snow'] : [];
    const bgState = { bg, transition: currentBgTransition };
    let targetLabel = labelName;
    let jumped = false;

    while (index < commands.length) {
      const cmd = commands[index];
      if (cmd.type === 'jump') {
        targetLabel = cmd.jumpLabel || '';
        index = 0;
        jumped = true;
        break;
      } else if (cmd.type === 'dialogue' || cmd.type === 'narration' || cmd.type === 'menu') {
        // Blocking command found. Stop automatic execution.
        break;
      } else {
        executeCommand(cmd, nextVars, nextChars, nextEffects, bgState);
        index++;
      }
    }

    setVariables(nextVars);
    setShownCharacters(nextChars);
    setActiveEffects(nextEffects);
    setCurrentBg(bgState.bg);
    setCurrentBgTransition(bgState.transition);

    if (jumped) {
      setCurrentLabel(targetLabel);
      setCurrentIndex(0);
      runInitialCommands(labels, targetLabel, nextVars, nextChars, nextEffects, bgState.bg);
    } else {
      setCurrentIndex(index);
      
      // Update narrative log for the first displayed dialogue/narration
      if (index < commands.length) {
        const activeCmd = commands[index];
        if (activeCmd.type === 'dialogue' || activeCmd.type === 'narration') {
          updateLog(activeCmd);
        }
      }
    }
  };

  // Helper to add dialogue to history log
  const updateLog = (cmd: ScenarioCommand) => {
    if (cmd.type === 'dialogue') {
      setShownLog((prev) => [...prev, { speaker: cmd.speaker || '알수없음', text: cmd.text || '' }]);
    } else if (cmd.type === 'narration') {
      setShownLog((prev) => [...prev, { speaker: '나레이션', text: cmd.text || '' }]);
    }
  };

  // Advance dialogue node
  const handleAdvance = () => {
    const commands = scriptLabels[currentLabel];
    if (!commands || currentIndex >= commands.length) return;

    // Check if the current node is a menu, which prevents direct clicking advancement
    if (commands[currentIndex].type === 'menu') return;

    let index = currentIndex + 1;
    const nextVars = { ...variables };
    const nextChars = { ...shownCharacters };
    
    // Transient effects are removed upon advancement (like shake or flash), but snow stays
    const nextEffects = activeEffects.includes('snow') ? ['snow'] : [];
    const bgState = { bg: currentBg, transition: currentBgTransition };
    let targetLabel = currentLabel;
    let jumped = false;

    while (index < commands.length) {
      const cmd = commands[index];
      if (cmd.type === 'jump') {
        targetLabel = cmd.jumpLabel || '';
        index = 0;
        jumped = true;
        break;
      } else if (cmd.type === 'dialogue' || cmd.type === 'narration' || cmd.type === 'menu') {
        // Stop on the next blocking command
        break;
      } else {
        executeCommand(cmd, nextVars, nextChars, nextEffects, bgState);
        index++;
      }
    }

    setVariables(nextVars);
    setShownCharacters(nextChars);
    setActiveEffects(nextEffects);
    setCurrentBg(bgState.bg);
    setCurrentBgTransition(bgState.transition);

    if (jumped) {
      setCurrentLabel(targetLabel);
      setCurrentIndex(0);
      runInitialCommands(scriptLabels, targetLabel, nextVars, nextChars, nextEffects, bgState.bg);
    } else {
      setCurrentIndex(index);
      if (index < commands.length) {
        updateLog(commands[index]);
      }
    }
  };

  // Choice Selection
  const handleChoiceSelected = (option: ChoiceOption) => {
    const nextVars = { ...variables };
    const nextChars = { ...shownCharacters };
    const nextEffects = activeEffects.includes('snow') ? ['snow'] : [];
    const bgState = { bg: currentBg, transition: currentBgTransition };

    // Apply choice side effects
    option.effects.forEach((eff) => {
      const currentVal = nextVars[eff.name] || 0;
      if (eff.op === '=') {
        nextVars[eff.name] = eff.value;
      } else if (eff.op === '+=') {
        nextVars[eff.name] = currentVal + eff.value;
      } else if (eff.op === '-=') {
        nextVars[eff.name] = currentVal - eff.value;
      }
    });

    setVariables(nextVars);
    
    // Log the selected choice for story history
    setShownLog((prev) => [...prev, { speaker: '선택', text: `> ${option.text}` }]);

    // Jump to the choice's label
    setCurrentLabel(option.jumpLabel);
    setCurrentIndex(0);
    runInitialCommands(scriptLabels, option.jumpLabel, nextVars, nextChars, nextEffects, bgState.bg);
  };

  // Start New Game
  const handleStartGame = () => {
    unlockAudio();
    setVariables(INITIAL_VARIABLES);
    setShownCharacters({});
    setCurrentBg(INTRO_BG);
    setCurrentBgTransition(DEFAULT_TRANSITION);
    setActiveEffects([]);
    setShownLog([]);
    setCinematicIntroActive(true);
    setGameState('playing');
    setCurrentLabel('scene_001');
    setCurrentIndex(0);
    runInitialCommands(scriptLabels, 'scene_001', INITIAL_VARIABLES, {}, [], '');
  };

  // Continue Game
  const handleContinue = () => {
    // Find slot with highest save date (or simply Slot 1 if available)
    let latestSlot: SaveSlot | null = null;
    for (let i = 1; i <= 4; i++) {
      const slot = saveSlots[i];
      if (slot) {
        if (!latestSlot || new Date(slot.date) > new Date(latestSlot.date)) {
          latestSlot = slot;
        }
      }
    }

    if (latestSlot) {
      unlockAudio();
      loadSaveSlot(latestSlot);
    }
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

    // Reconstruct logs back from dialogue nodes up to the loaded point
    const historyLogs: LogItem[] = [];
    const commands = scriptLabels[slot.currentLabel];
    if (commands && slot.currentIndex < commands.length) {
      const cmd = commands[slot.currentIndex];
      if (cmd.type === 'dialogue') {
        historyLogs.push({ speaker: cmd.speaker || '알수없음', text: cmd.text || '' });
      } else if (cmd.type === 'narration') {
        historyLogs.push({ speaker: '나레이션', text: cmd.text || '' });
      }
    }
    setShownLog(historyLogs);
  };

  const handleSaveSlot = (slotId: number) => {
    const commands = scriptLabels[currentLabel];
    const currentCmd = commands ? commands[currentIndex] : null;
    
    let lineText = '';
    if (currentCmd) {
      lineText = currentCmd.text || currentCmd.rawLine || '';
    }

    const saveDate = new Date().toLocaleString('ko-KR');

    const newSave: SaveSlot = {
      id: slotId,
      date: saveDate,
      chapter: currentLabel.startsWith('scene_01') ? '1장: 버려진 주막의 밤' : '프롤로그: 눈 내린 고갯길',
      sceneTitle: currentCmd?.type === 'dialogue' ? `${currentCmd.speaker}의 말` : '고갯길 피바람',
      lineText: lineText.length > 50 ? lineText.substring(0, 50) + '...' : lineText,
      variables,
      currentLabel,
      currentIndex,
      shownCharacters,
      currentBg,
      currentBgTransition,
      activeEffects
    };

    localStorage.setItem(`yeokgwi_save_slot_${slotId}`, JSON.stringify(newSave));
    setSaveSlots((prev) => ({ ...prev, [slotId]: newSave }));
    setActiveModal(null);
  };

  const handleLoadSlot = (slotId: number) => {
    const slot = saveSlots[slotId];
    if (slot) {
      unlockAudio();
      loadSaveSlot(slot);
    }
  };

  const activeCommands = scriptLabels[currentLabel] || [];
  const currentCommand = activeCommands[currentIndex] || null;

  // Find the last dialogue/narration to display behind the menu options
  const displayCommand = currentCommand?.type === 'menu'
    ? (activeCommands.slice(0, currentIndex).reverse().find(c => c.type === 'dialogue' || c.type === 'narration') || currentCommand)
    : currentCommand;

  if (loading) {
    return (
      <div 
        className="hanji-texture" 
        style={{ 
          display: 'flex', 
          color: 'var(--bloody-red-2)', 
          fontSize: '24px', 
          fontWeight: 'bold',
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '1280px', 
          height: '720px' 
        }}
      >
        {loadingMessage}
      </div>
    );
  }

  return (
    <div
      className="game-scale-wrapper"
      style={{
        width: '1280px',
        height: '720px',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0
      }}
    >
      <div className="game-viewport hanji-texture">
        {gameState === 'main_menu' ? (
          <MainMenu
            onStartGame={handleStartGame}
            onOpenLoad={() => setActiveModal('load')}
            onOpenSettings={() => setActiveModal('settings')}
            hasSaves={hasSaves}
            onContinue={handleContinue}
          />
        ) : (
          <>
            {/* Main Visual Presentation */}
            <Visuals
              bg={currentBg}
              bgTransition={currentBgTransition}
              shownCharacters={shownCharacters}
              activeEffects={activeEffects}
            />
            <div className="cinematic-stage-overlay" aria-hidden="true" />
            <div className="cinematic-letterbox" aria-hidden="true" />

            {/* Dialogue Box and footer actions */}
            {currentCommand && displayCommand && (
              <DialogueBox
                speaker={displayCommand.type === 'dialogue' ? displayCommand.speaker : undefined}
                text={displayCommand.text}
                expression={displayCommand.expression}
                options={currentCommand.type === 'menu' ? currentCommand.options : undefined}
                textSpeed={textSpeed}
                autoMode={autoMode}
                skipMode={skipMode}
                onAdvance={handleAdvance}
                onChoiceSelected={handleChoiceSelected}
                onOpenLog={() => setActiveModal('log')}
                onOpenSave={() => setActiveModal('save')}
                onOpenLoad={() => setActiveModal('load')}
                onOpenSettings={() => setActiveModal('settings')}
                onExit={() => {
                  stopMusic();
                  setCinematicIntroActive(false);
                  setGameState('main_menu');
                }}
                onToggleAuto={() => setAutoMode(!autoMode)}
              />
            )}

            {cinematicIntroActive && (
              <CinematicIntro onComplete={handleCinematicIntroComplete} />
            )}
          </>
        )}

        {/* Modals rendering */}
        {activeModal === 'save' && (
          <SaveLoadModal
            mode="save"
            slots={saveSlots}
            onClose={() => setActiveModal(null)}
            onSlotAction={handleSaveSlot}
          />
        )}

        {activeModal === 'load' && (
          <SaveLoadModal
            mode="load"
            slots={saveSlots}
            onClose={() => setActiveModal(null)}
            onSlotAction={handleLoadSlot}
          />
        )}

        {activeModal === 'log' && (
          <LogModal
            log={shownLog}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'settings' && (
          <SettingsModal
            textSpeed={textSpeed}
            bgmVolume={bgmVolume}
            sfxVolume={sfxVolume}
            onTextSpeedChange={setTextSpeed}
            onBgmVolumeChange={setBgmVolume}
            onSfxVolumeChange={setSfxVolume}
            onClose={() => setActiveModal(null)}
          />
        )}
      </div>
    </div>
  );
}
