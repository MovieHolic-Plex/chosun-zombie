import { useState, useEffect } from 'react';
import { parseScript } from './engine/parser';
import type { ScenarioCommand, ChoiceOption, GameVariables, SaveSlot, LogItem } from './engine/types';
import { Visuals } from './components/Visuals';
import { DialogueBox } from './components/DialogueBox';
import { MainMenu } from './components/MainMenu';
import { SaveLoadModal } from './components/SaveLoadModal';
import { LogModal } from './components/LogModal';
import { SettingsModal } from './components/SettingsModal';

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

export default function App() {
  // Scenario Data
  const [scriptLabels, setScriptLabels] = useState<{ [label: string]: ScenarioCommand[] }>({});
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [gameState, setGameState] = useState<'main_menu' | 'playing'>('main_menu');
  const [currentLabel, setCurrentLabel] = useState('scene_001');
  const [currentIndex, setCurrentIndex] = useState(0);

  // visual state
  const [currentBg, setCurrentBg] = useState('');
  const [shownCharacters, setShownCharacters] = useState<{ [charId: string]: string }>({});
  const [activeEffects, setActiveEffects] = useState<string[]>([]);

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
  const [skipMode, setSkipMode] = useState(false);

  // Fetch and Parse Scripts on Mount
  useEffect(() => {
    const loadScripts = async () => {
      try {
        const prologueRes = await fetch('/scripts/prologue.txt');
        const prologueText = await prologueRes.text();
        const ch1Res = await fetch('/scripts/chapter01.txt');
        const ch1Text = await ch1Res.text();

        const prologueLabels = parseScript(prologueText);
        const ch1Labels = parseScript(ch1Text);

        const mergedLabels = { ...prologueLabels, ...ch1Labels };
        setScriptLabels(mergedLabels);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load visual novel scripts:', err);
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
  }, []);

  const hasSaves = Object.values(saveSlots).some((s) => s !== null);

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
    charsState: { [key: string]: string },
    effectsState: string[],
    bgState: { bg: string }
  ) => {
    switch (cmd.type) {
      case 'scene':
        if (cmd.bgId) {
          bgState.bg = cmd.bgId;
        }
        break;
      case 'show':
        if (cmd.charId) {
          charsState[cmd.charId] = cmd.expression || 'neutral';
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
        console.log(`[Bgm Interface] Playing music: ${cmd.audioId}`);
        break;
      case 'play_sound':
        console.log(`[Sfx Interface] Playing sound: ${cmd.audioId}`);
        break;
      case 'stop_music':
        console.log(`[Bgm Interface] Stopping BGM`);
        break;
      case 'stop_sound':
        console.log(`[Sfx Interface] Stopping SFX`);
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
    chars: { [key: string]: string },
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
    const bgState = { bg };
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
    const bgState = { bg: currentBg };
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
    const bgState = { bg: currentBg };

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
    setVariables(INITIAL_VARIABLES);
    setShownCharacters({});
    setCurrentBg('');
    setActiveEffects([]);
    setShownLog([]);
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
      loadSaveSlot(latestSlot);
    }
  };

  const loadSaveSlot = (slot: SaveSlot) => {
    setVariables(slot.variables);
    setShownCharacters(slot.shownCharacters);
    setCurrentBg(slot.currentBg);
    setActiveEffects(slot.activeEffects);
    setCurrentLabel(slot.currentLabel);
    setCurrentIndex(slot.currentIndex);
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
      activeEffects
    };

    localStorage.setItem(`yeokgwi_save_slot_${slotId}`, JSON.stringify(newSave));
    setSaveSlots((prev) => ({ ...prev, [slotId]: newSave }));
    setActiveModal(null);
  };

  const handleLoadSlot = (slotId: number) => {
    const slot = saveSlots[slotId];
    if (slot) {
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
        시나리오 서책을 펼치는 중...
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
              shownCharacters={shownCharacters}
              activeEffects={activeEffects}
            />

            {/* Mapae & Hopae Styled QA Panel (Top Left) */}
            <div className="mapae-container">
              <div className="mapae-medallion">
                <div className="mapae-knot" />
                <div className="mapae-ring-outer">
                  <div className="mapae-ring-inner">
                    <div className="mapae-emblem-container">
                      <div className="mapae-emblem">馬</div>
                      <div className="mapae-text">暗行御史</div>
                    </div>
                  </div>
                </div>
                <div className="mapae-bead" />
                <div className="mapae-tassel" />
              </div>
              
              <div className="hopae-tablet">
                <div className="hopae-cord" />
                <div className="hopae-hole" />
                <div className="hopae-inner-border">
                  <div className="hopae-title">관찰목패 (觀察木牌)</div>
                  
                  <div className="hopae-item">
                    <span className="hopae-label">소녀 신뢰 (少女信賴)</span>
                    <span className="hopae-val">{variables.trust_girl}</span>
                  </div>
                  <div className="hopae-item">
                    <span className="hopae-label">인간성 (人間性)</span>
                    <span className="hopae-val">{variables.humanity}</span>
                  </div>
                  <div className="hopae-item">
                    <span className="hopae-label">소녀 의심 (少女疑心)</span>
                    <span className="hopae-val">{variables.suspicion}</span>
                  </div>
                  <div className="hopae-item">
                    <span className="hopae-label">역병 진실 (疫病眞實)</span>
                    <span className="hopae-val">{variables.truth}</span>
                  </div>
                  <div className="hopae-item">
                    <span className="hopae-label">역귀 공명 (疫鬼共鳴)</span>
                    <span className="hopae-val">{variables.plague_resonance}</span>
                  </div>
                  <div className="hopae-item">
                    <span className="hopae-label">군량 / 약재 (軍糧 / 藥材)</span>
                    <span className="hopae-val">{variables.food} / {variables.medicine}</span>
                  </div>
                  <div className="hopae-item hopae-item-highlight">
                    <span className="hopae-label">딸 집착 (執着)</span>
                    <span className="hopae-val">{variables.daughter_attachment}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dev Debugging overlay (Top Right) */}
            <div className="debug-panel">
              <strong>[개발용 상태판]</strong><br />
              장면 표식: {currentLabel}<br />
              진행 색인: {currentIndex} / {activeCommands.length - 1}<br />
              수행 명령: {currentCommand?.type?.toUpperCase()}<br />
              자동 진행: {autoMode ? '켬' : '끔'} | <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setSkipMode(!skipMode)}>건너뛰기: {skipMode ? '켬' : '끔'}</span>
            </div>

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
                onExit={() => setGameState('main_menu')}
                onToggleAuto={() => setAutoMode(!autoMode)}
              />
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
