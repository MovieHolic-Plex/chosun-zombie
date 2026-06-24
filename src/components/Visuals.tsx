import React, { useState, useEffect, useRef } from 'react';
import { useTransparentImage } from '../hooks/useTransparentImage';
import { CHARACTER_MAP } from '../engine/types';

interface VisualsProps {
  bg: string;
  shownCharacters: { [charId: string]: string }; // charId -> expression
  activeEffects: string[];
}

// Maps bg IDs to local paths or generated visual representations
const getBgUrl = (bgId: string): string => {
  // If we generate them, they'll be saved in /assets/bg/[bgId].png
  // To prevent errors when files don't exist yet, we'll fall back to gradients if image loading fails
  return `/assets/bg/${bgId}.png`;
};

// Maps character and expression to image URL
const getCharacterUrl = (charId: string, expression: string): string => {
  const formattedExpr = expression.toLowerCase();
  const code = CHARACTER_MAP[charId] || 'sh';
  const filename = `${code}_${formattedExpr}.png`;
  return `/assets/char/${filename}`;
};

// Sub-component to safely call useTransparentImage Hook for each character
const CharacterSprite: React.FC<{ charId: string; expr: string; positionClass: string }> = ({
  charId,
  expr,
  positionClass
}) => {
  const rawUrl = getCharacterUrl(charId, expr);
  const transparentUrl = useTransparentImage(rawUrl, 40);

  return (
    <div className={`character-sprite-wrapper ${positionClass}`}>
      <img
        src={transparentUrl}
        alt={`${charId} (${expr})`}
        className="character-sprite-img"
        onError={(e) => {
          // Fallback if AI image file is not generated/loaded yet
          // Renders a high quality styled SVG placeholder box
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            const fallback = parent.querySelector('.char-fallback');
            if (fallback) (fallback as HTMLElement).style.display = 'flex';
          }
        }}
      />
      {/* Fallback silhouette block with calligraphy text */}
      <div
        className="char-fallback"
        style={{
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '180px',
          height: '420px',
          backgroundColor: charId === '이현' ? 'rgba(45, 45, 45, 0.85)' : 'rgba(58, 80, 107, 0.85)',
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
          [{expr.toUpperCase()}]
        </span>
        {charId}
      </div>
    </div>
  );
};

export const Visuals: React.FC<VisualsProps> = ({ bg, shownCharacters, activeEffects }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Transition background state
  const [currentBg, setCurrentBg] = useState(bg);
  const [prevBg, setPrevBg] = useState('');

  useEffect(() => {
    if (bg !== currentBg) {
      setPrevBg(currentBg);
      setCurrentBg(bg);
      const timer = setTimeout(() => {
        setPrevBg('');
      }, 600); // 600ms transition
      return () => clearTimeout(timer);
    }
  }, [bg, currentBg]);

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
  const isFlashRed = activeEffects.includes('flash-red') || activeEffects.includes('flash');
  const isFlashWhite = activeEffects.includes('flash-white');

  return (
    <div className={`visuals-container ${isShake ? 'shake' : ''}`}>
      {/* Previous Background Layer (fading out) */}
      {prevBg && (
        <div
          className="background-layer fade-out"
          style={{
            backgroundImage: `url(${getBgUrl(prevBg)})`,
            backgroundColor: '#16171d',
            zIndex: 1
          }}
        />
      )}

      {/* Current Background Layer (fading in) */}
      <div
        className="background-layer fade-in"
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
      <div className="character-layer">
        {Object.entries(shownCharacters).map(([charId, expr]) => {
          // Determine sprite position
          let positionClass = 'char-pos-center';
          if (charId === '이현') {
            positionClass = 'char-pos-left';
          } else if (charId === '소녀') {
            positionClass = 'char-pos-right';
          }

          return (
            <CharacterSprite
              key={charId}
              charId={charId}
              expr={expr}
              positionClass={positionClass}
            />
          );
        })}
      </div>
    </div>
  );
};
