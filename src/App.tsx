import { Visuals } from './components/Visuals';
import { CinematicIntro } from './components/CinematicIntro';
import { DialogueBox } from './components/DialogueBox';
import { MainMenu } from './components/MainMenu';
import { SaveLoadModal } from './components/SaveLoadModal';
import { LogModal } from './components/LogModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminSkipPanel } from './components/AdminSkipPanel';
import { useResponsiveScale } from './hooks/useResponsiveScale';
import { useVisualNovelSession } from './hooks/useVisualNovelSession';

export default function App() {
  const scale = useResponsiveScale();
  const session = useVisualNovelSession();
  const showAdminTools = session.gameState === 'playing';

  if (session.loading) {
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
        {session.loadingMessage}
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
        {session.gameState === 'main_menu' ? (
          <MainMenu
            onStartGame={session.handleStartGame}
            onOpenLoad={() => session.setActiveModal('load')}
            onOpenSettings={() => session.setActiveModal('settings')}
            hasSaves={session.hasSaves}
            onContinue={session.handleContinue}
          />
        ) : (
          <>
            <Visuals
              bg={session.currentBg}
              bgTransition={session.currentBgTransition}
              shownCharacters={session.shownCharacters}
              activeEffects={session.activeEffects}
            />
            <div className="cinematic-stage-overlay" aria-hidden="true" />
            <div className="cinematic-letterbox" aria-hidden="true" />

            {showAdminTools && (
              <AdminSkipPanel
                currentIndex={session.currentIndex}
                currentLabel={session.currentLabel}
                scriptLabels={session.scriptLabels}
                onJumpByDialogueOffset={session.jumpByAdminDialogueOffset}
                onJumpByOffset={session.jumpByAdminOffset}
                onJumpToLabel={session.jumpToLabelForAdmin}
              />
            )}

            {session.currentCommand && session.displayCommand && (
              <DialogueBox
                speaker={session.displayCommand.type === 'dialogue' ? session.displayCommand.speaker : undefined}
                text={session.displayCommand.text}
                expression={session.displayCommand.expression}
                options={session.currentCommand.type === 'menu' ? session.currentCommand.options : undefined}
                textSpeed={session.textSpeed}
                autoMode={session.autoMode}
                skipMode={session.skipMode}
                onAdvance={session.handleAdvance}
                onChoiceSelected={session.handleChoiceSelected}
                onOpenLog={() => session.setActiveModal('log')}
                onOpenSave={() => session.setActiveModal('save')}
                onOpenLoad={() => session.setActiveModal('load')}
                onOpenSettings={() => session.setActiveModal('settings')}
                onExit={() => {
                  session.stopMusic();
                  session.setCinematicIntroActive(false);
                  session.setGameState('main_menu');
                }}
                onToggleAuto={() => session.setAutoMode(!session.autoMode)}
              />
            )}

            {session.cinematicIntroActive && (
              <CinematicIntro onComplete={() => session.setCinematicIntroActive(false)} />
            )}
          </>
        )}

        {session.activeModal === 'save' && (
          <SaveLoadModal
            mode="save"
            slots={session.saveSlots}
            onClose={() => session.setActiveModal(null)}
            onSlotAction={session.handleSaveSlot}
          />
        )}

        {session.activeModal === 'load' && (
          <SaveLoadModal
            mode="load"
            slots={session.saveSlots}
            onClose={() => session.setActiveModal(null)}
            onSlotAction={session.handleLoadSlot}
          />
        )}

        {session.activeModal === 'log' && (
          <LogModal
            log={session.shownLog}
            onClose={() => session.setActiveModal(null)}
          />
        )}

        {session.activeModal === 'settings' && (
          <SettingsModal
            textSpeed={session.textSpeed}
            bgmVolume={session.bgmVolume}
            sfxVolume={session.sfxVolume}
            onTextSpeedChange={session.setTextSpeed}
            onBgmVolumeChange={session.setBgmVolume}
            onSfxVolumeChange={session.setSfxVolume}
            onClose={() => session.setActiveModal(null)}
          />
        )}
      </div>
    </div>
  );
}
