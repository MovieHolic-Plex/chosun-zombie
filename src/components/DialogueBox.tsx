import React, { useState, useEffect, useRef } from 'react';
import type { ChoiceOption } from '../engine/types';
import { CHARACTER_MAP } from '../engine/types';
import { BookOpen, Play, Save, FolderOpen, Settings, LogOut } from 'lucide-react';
import { useTransparentImage } from '../hooks/useTransparentImage';

interface DialogueBoxProps {
  speaker?: string;
  text?: string;
  expression?: string;
  options?: ChoiceOption[];
  textSpeed: number; // characters per second
  autoMode: boolean;
  skipMode: boolean;
  onAdvance: () => void;
  onChoiceSelected: (option: ChoiceOption) => void;
  onOpenLog: () => void;
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
  onToggleAuto: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  speaker,
  text = '',
  expression = 'neutral',
  options,
  textSpeed,
  autoMode,
  skipMode,
  onAdvance,
  onChoiceSelected,
  onOpenLog,
  onOpenSave,
  onOpenLoad,
  onOpenSettings,
  onExit,
  onToggleAuto
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const charCode = speaker ? (CHARACTER_MAP[speaker] || 'sh') : '';
  const expr = (expression || 'neutral').toLowerCase();

  // Multi-step fallback for portrait image path:
  // 1. Dedicated face chip with current expression: /assets/face/ih_angry.png
  // 2. Dedicated face chip with neutral expression: /assets/face/ih_neutral.png
  // 3. Full sprite with current expression: /assets/char/ih_angry.png
  // 4. Full sprite with neutral expression: /assets/char/ih_neutral.png
  const portraitCandidates = charCode ? Array.from(new Set([
    `/assets/face/${charCode}_${expr}.png`,
    `/assets/face/${charCode}_neutral.png`,
    `/assets/char/${charCode}_${expr}.png`,
    `/assets/char/${charCode}_neutral.png`
  ])) : [];

  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    setFallbackIndex(0);
  }, [speaker, expression]);

  const rawPortraitUrl = portraitCandidates[fallbackIndex] || '';
  const transparentPortraitUrl = useTransparentImage(rawPortraitUrl, 40);
  const isFaceChip = rawPortraitUrl.startsWith('/assets/face/');

  // Typewriter Effect
  useEffect(() => {
    // Reset typing
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    if (skipMode || textSpeed === 0) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    let current = '';
    let index = 0;
    const intervalMs = 1000 / textSpeed;

    const tick = () => {
      if (index < text.length) {
        current += text.charAt(index);
        setDisplayedText(current);
        index++;
        typingTimerRef.current = setTimeout(tick, intervalMs);
      } else {
        setIsTyping(false);
      }
    };

    tick();

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [text, textSpeed, skipMode]);

  // Auto Mode advancement
  useEffect(() => {
    if (autoMode && !isTyping && (!options || options.length === 0)) {
      const autoTimer = setTimeout(() => {
        onAdvance();
      }, 2000); // Wait 2 seconds before advancing automatically
      return () => clearTimeout(autoTimer);
    }
  }, [autoMode, isTyping, options, onAdvance]);

  const handleBoxClick = () => {
    // Prevent clicking from advancing if choices are displayed
    if (options && options.length > 0) return;

    if (isTyping) {
      // Force finish typing
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      setDisplayedText(text);
      setIsTyping(false);
    } else {
      onAdvance();
    }
  };

  const showPortrait = !!(speaker && CHARACTER_MAP[speaker]);

  return (
    <div className="dialogue-area">
      {/* Viewport-wide click-to-advance overlay */}
      {(!options || options.length === 0) && (
        <div 
          className="viewport-click-overlay" 
          onClick={handleBoxClick}
        />
      )}

      {/* Choice Buttons Overlay (rendered above dialogue box if menu is active) */}
      {options && options.length > 0 && (
        <div className="choices-container">
          {options.map((opt, idx) => (
            <button
              key={idx}
              className="choice-button brush-border"
              onClick={() => onChoiceSelected(opt)}
              style={{ animationDelay: `${idx * 0.12}s` }}
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {/* Main Dialogue Box */}
      <div 
        className="dialogue-box-container" 
        onClick={handleBoxClick}
        style={{ cursor: (options && options.length > 0) ? 'default' : 'pointer' }}
      >
        {/* Character Portrait inside Box (Left aligned, similar to concept sheet UI) */}
        {showPortrait && transparentPortraitUrl && (
          <div className="dialogue-portrait-area brush-border">
            <img
              key={transparentPortraitUrl}
              src={transparentPortraitUrl}
              alt={speaker}
              className={`dialogue-portrait-img ${isFaceChip ? 'face-chip' : 'full-sprite'}`}
              onLoad={(event) => {
                event.currentTarget.style.display = 'block';
                const parent = event.currentTarget.parentElement;
                if (parent) {
                  const label = parent.querySelector('.portrait-fallback');
                  if (label) (label as HTMLElement).style.display = 'none';
                }
              }}
              onError={(event) => {
                if (fallbackIndex < portraitCandidates.length - 1) {
                  setFallbackIndex(prev => prev + 1);
                } else {
                  event.currentTarget.style.display = 'none';
                  const parent = event.currentTarget.parentElement;
                  if (parent) {
                    const label = parent.querySelector('.portrait-fallback');
                    if (label) (label as HTMLElement).style.display = 'flex';
                  }
                }
              }}
            />
            <div
              className="portrait-fallback"
              style={{
                display: 'none',
                width: '100%',
                height: '100%',
                backgroundColor: 'var(--hanji-beige-4)',
                color: 'var(--ash-grey-2)',
                fontSize: '12px',
                fontWeight: 'bold',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {speaker}
            </div>
          </div>
        )}

        {/* Text Area */}
        <div className="dialogue-content-area">
          {speaker && (
            <div key={speaker} className="dialogue-name">
              {speaker}
            </div>
          )}
          <div className="dialogue-text custom-scrollbar">
            {displayedText}
          </div>
        </div>

        {/* Flashing advance indicator arrow */}
        {!isTyping && (!options || options.length === 0) && (
          <div className="dialogue-arrow" />
        )}
      </div>

      {/* Footer System Menu */}
      <div className="dialogue-footer-menu">
        <button className="footer-btn" onClick={onOpenLog}>
          <BookOpen size={13} />
          기록
        </button>
        <button 
          className="footer-btn" 
          onClick={onToggleAuto}
          style={{ color: autoMode ? 'var(--lantern-yellow-1)' : '' }}
        >
          <Play size={13} />
          {autoMode ? '자동 진행 중' : '자동'}
        </button>
        <button className="footer-btn" onClick={onOpenSave}>
          <Save size={13} />
          저장
        </button>
        <button className="footer-btn" onClick={onOpenLoad}>
          <FolderOpen size={13} />
          불러오기
        </button>
        <button className="footer-btn" onClick={onOpenSettings}>
          <Settings size={13} />
          설정
        </button>
        <button className="footer-btn" onClick={onExit}>
          <LogOut size={13} />
          종료
        </button>
      </div>
    </div>
  );
};
