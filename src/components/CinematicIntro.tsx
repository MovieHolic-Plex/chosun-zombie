import { useEffect } from 'react';

const CINEMATIC_INTRO_DURATION_MS = 4300;

interface CinematicIntroProps {
  readonly onComplete: () => void;
}

export const CinematicIntro = ({ onComplete }: CinematicIntroProps) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, CINEMATIC_INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="cinematic-intro" aria-hidden="true">
      <div className="cinematic-film-grain" />
      <div className="cinematic-seal">
        <span>疫</span>
      </div>
      <div className="cinematic-shot-strip" aria-hidden="true">
        <span>팔도 봉쇄</span>
        <span>굶주린 고을</span>
        <span>종소리와 주술</span>
      </div>
      <div className="cinematic-blood-line" />
      <div className="cinematic-title-card">
        <span className="cinematic-title-mark">눈 아래의 조선</span>
        <span className="cinematic-title-sub">죽은 자는 소리를 따라 걷는다</span>
      </div>
      <div className="cinematic-rip" />
    </div>
  );
};
