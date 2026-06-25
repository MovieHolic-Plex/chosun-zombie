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
        <span>병조 밀명</span>
        <span>눈 속의 시체</span>
        <span>아이의 숨</span>
      </div>
      <div className="cinematic-blood-line" />
      <div className="cinematic-title-card">
        <span className="cinematic-title-mark">금역의 눈길</span>
        <span className="cinematic-title-sub">죽은 자가 길을 외운다</span>
      </div>
      <div className="cinematic-rip" />
    </div>
  );
};
