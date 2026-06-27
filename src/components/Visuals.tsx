import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTransparentImage } from '../hooks/useTransparentImage';
import type { ShownCharacters, VisualTransition } from '../engine/types';
import {
  createRenderedSprite,
  getBgUrl,
  resolveCharacterVisual
} from '../engine/visuals';
import type { RenderedSprite, ResolvedCharacterVisual } from '../engine/visuals';

interface VisualsProps {
  bg: string;
  bgTransition: VisualTransition;
  shownCharacters: ShownCharacters;
  activeEffects: string[];
}

const TRANSITION_DURATION_MS = 680;

// Sub-component to safely call useTransparentImage Hook for each character
const CharacterSprite: React.FC<{ sprite: RenderedSprite }> = ({ sprite }) => {
  const transparentUrl = useTransparentImage(sprite.imageUrl, 40);
  const [hasImageError, setHasImageError] = useState(false);
  const positionClass = `char-pos-${sprite.position}`;
  const imageReady = transparentUrl.length > 0;
  const shouldRenderImage = imageReady && !hasImageError;

  useEffect(() => {
    setHasImageError(false);
  }, [sprite.imageUrl]);

  return (
    <div
      className={[
        'character-sprite-wrapper',
        imageReady ? 'is-ready' : 'is-loading',
        positionClass,
        `char-code-${sprite.characterCode}`,
        `renpy-${sprite.phase}`,
        `renpy-${sprite.transition}`
      ].join(' ')}
    >
      {shouldRenderImage && (
        <img
          src={transparentUrl}
          alt={`${sprite.charId} (${sprite.expression})`}
          className="character-sprite-img"
          onError={() => setHasImageError(true)}
        />
      )}
      {/* Fallback silhouette block with calligraphy text */}
      <div
        className="char-fallback"
        style={{
          display: hasImageError ? 'flex' : 'none',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '180px',
          height: '420px',
          backgroundColor: sprite.charId === '이현' ? 'rgba(45, 45, 45, 0.85)' : 'rgba(58, 80, 107, 0.85)',
          border: '3px double var(--hanji-beige-4)',
          color: 'var(--hanji-beige-2)',
          fontFamily: 'var(--font-serif)',
          fontSize: '24px',
          fontWeight: 'bold',
          writingMode: 'vertical-rl',
          padding: '20px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.5s ease-in-out'
        }}
      >
        <span style={{ fontSize: '14px', marginBottom: '8px', writingMode: 'horizontal-tb' }}>
          [{sprite.expression.toUpperCase()}]
        </span>
        {sprite.charId}
      </div>
    </div>
  );
};

export const Visuals: React.FC<VisualsProps> = ({
  bg,
  bgTransition,
  shownCharacters,
  activeEffects
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousCharactersRef = useRef<Record<string, ResolvedCharacterVisual>>({});
  const renderSequenceRef = useRef(0);

  // Transition background state
  const [currentBg, setCurrentBg] = useState(bg);
  const [prevBg, setPrevBg] = useState('');
  const [exitingSprites, setExitingSprites] = useState<readonly RenderedSprite[]>([]);

  useEffect(() => {
    if (bg !== currentBg) {
      setPrevBg(currentBg);
      setCurrentBg(bg);
      const timer = setTimeout(() => {
        setPrevBg('');
      }, TRANSITION_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [bg, currentBg]);

  const currentCharacters = useMemo<Record<string, ResolvedCharacterVisual>>(() => {
    const resolvedCharacters: Record<string, ResolvedCharacterVisual> = {};
    Object.entries(shownCharacters).forEach(([charId, display]) => {
      resolvedCharacters[charId] = resolveCharacterVisual(charId, display);
    });
    return resolvedCharacters;
  }, [shownCharacters]);

  useEffect(() => {
    const previousCharacters = previousCharactersRef.current;
    const nextExiting: RenderedSprite[] = [];

    Object.entries(previousCharacters).forEach(([charId, previous]) => {
      const next = currentCharacters[charId];
      if (!next || next.imageKey !== previous.imageKey) {
        renderSequenceRef.current += 1;
        nextExiting.push(createRenderedSprite(previous, 'exit', renderSequenceRef.current));
      }
    });

    previousCharactersRef.current = currentCharacters;

    if (nextExiting.length === 0) return;

    setExitingSprites((prev) => [...prev, ...nextExiting]);
    const timer = setTimeout(() => {
      setExitingSprites((prev) => prev.filter((sprite) => !nextExiting.includes(sprite)));
    }, TRANSITION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [currentCharacters]);

  // Canvas Snow Particle System
  useEffect(() => {
    if (!activeEffects.includes('snow')) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const maxFlakes = 150;
    const flakes: Array<{ x: number; y: number; r: number; d: number; speedY: number; drift: number }> = [];

    for (let i = 0; i < maxFlakes; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1, // radius 1-3
        d: Math.random() * maxFlakes, // density
        speedY: Math.random() * 1.5 + 0.5,
        drift: Math.random() * 0.5 - 0.25
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      
      for (let i = 0; i < maxFlakes; i++) {
        const f = flakes[i];
        ctx.moveTo(f.x, f.y);
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);

        // Update positions
        f.y += f.speedY;
        f.x += f.drift + Math.sin(f.y / 30) * 0.2;

        // Reset particle if it falls off screen
        if (f.y > height || f.x > width || f.x < 0) {
          flakes[i] = {
            x: Math.random() * width,
            y: -10,
            r: f.r,
            d: f.d,
            speedY: f.speedY,
            drift: f.drift
          };
        }
      }
      ctx.fill();
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeEffects]);

  // Determine shake and flash classes
  const isShake = activeEffects.includes('shake');
  const isHpunch = activeEffects.includes('hpunch');
  const isVpunch = activeEffects.includes('vpunch');
  const isFlashRed = activeEffects.includes('flash-red') || activeEffects.includes('flash');
  const isFlashWhite = activeEffects.includes('flash-white');
  const stagePositionClass = useMemo(() => {
    const activePositions = Object.values(currentCharacters).map((visual) => visual.position);
    const hasLeft = activePositions.includes('left');
    const hasCenter = activePositions.includes('center');
    const hasRight = activePositions.includes('right');

    if (hasLeft && hasCenter && !hasRight) {
      return 'stage-left-center';
    }

    if (!hasLeft && hasCenter && hasRight) {
      return 'stage-center-right';
    }

    return '';
  }, [currentCharacters]);

  return (
    <div
      className={[
        'visuals-container',
        isShake ? 'shake' : '',
        isHpunch ? 'renpy-hpunch' : '',
        isVpunch ? 'renpy-vpunch' : ''
      ].join(' ')}
    >
      {/* Previous Background Layer (fading out) */}
      {prevBg && (
        <div
          className={`background-layer renpy-bg-out renpy-${bgTransition}`}
          style={{
            backgroundImage: `url(${getBgUrl(prevBg)})`,
            backgroundColor: '#16171d',
            zIndex: 1
          }}
        />
      )}

      {/* Current Background Layer (fading in) */}
      <div
        className={`background-layer renpy-bg-in renpy-${bgTransition}`}
        style={{
          backgroundImage: currentBg
            ? `url(${getBgUrl(currentBg)})`
            : 'radial-gradient(circle, #2d3f37 0%, #101115 100%)',
          backgroundColor: '#16171d',
          zIndex: 2
        }}
      />

      {/* Snow canvas overlay */}
      {activeEffects.includes('snow') && (
        <canvas ref={canvasRef} className="snow-canvas" />
      )}

      {/* Screen flash effects */}
      {isFlashRed && <div className="screen-effect-container flash-red" />}
      {isFlashWhite && <div className="screen-effect-container flash-white" />}

      {/* Character Sprite Layer */}
      <div className={['character-layer', stagePositionClass].filter(Boolean).join(' ')}>
        {exitingSprites.map((sprite) => (
          <CharacterSprite key={sprite.renderKey} sprite={sprite} />
        ))}
        {Object.values(currentCharacters).map((visual) => {
          const sprite = createRenderedSprite(visual, 'enter', 0);
          return <CharacterSprite key={visual.imageKey} sprite={sprite} />;
        })}
      </div>
    </div>
  );
};
