import React from 'react';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenLoad: () => void;
  onOpenSettings: () => void;
  hasSaves: boolean;
  onContinue: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenLoad,
  onOpenSettings,
  hasSaves,
  onContinue
}) => {
  return (
    <div className="title-screen hanji-texture">
      <div className="title-logo-container">
        <h1 className="title-main-logo glow-text">역귀야행</h1>
        <p className="title-sub-logo">逆鬼夜行</p>
        <p
          style={{
            color: 'var(--hanji-beige-3)',
            marginTop: '25px',
            fontSize: '14px',
            letterSpacing: '2px',
            fontStyle: 'italic',
            opacity: 0.85
          }}
        >
          흥선대원군 시대, 죽은 자들이 깨어나는 역병의 시대.
        </p>
      </div>

      <div className="menu-options">
        {hasSaves && (
          <button className="joseon-btn joseon-btn-premium brush-border" onClick={onContinue}>
            여정 이어가기
          </button>
        )}
        
        <button className="joseon-btn brush-border" onClick={onStartGame}>
          새 여정 시작
        </button>

        <button 
          className="joseon-btn brush-border" 
          onClick={onOpenLoad}
          disabled={!hasSaves}
          style={{ 
            opacity: hasSaves ? 1 : 0.5,
            cursor: hasSaves ? 'pointer' : 'not-allowed'
          }}
        >
          기록 불러오기
        </button>

        <button className="joseon-btn brush-border" onClick={onOpenSettings}>
          환경 설정
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          color: 'var(--ash-grey-4)',
          fontSize: '11px',
          letterSpacing: '1px'
        }}
      >
        © 2026. Antigravity Pair Programming Project. All rights reserved.
      </div>
    </div>
  );
};
