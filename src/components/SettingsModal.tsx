import React from 'react';
import { X, Settings } from 'lucide-react';

interface SettingsModalProps {
  textSpeed: number;
  bgmVolume: number;
  sfxVolume: number;
  onTextSpeedChange: (speed: number) => void;
  onBgmVolumeChange: (vol: number) => void;
  onSfxVolumeChange: (vol: number) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  textSpeed,
  bgmVolume,
  sfxVolume,
  onTextSpeedChange,
  onBgmVolumeChange,
  onSfxVolumeChange,
  onClose
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="modal-title">
          <Settings size={24} />
          환경 설정 (Settings)
        </h2>

        <div className="modal-body custom-scrollbar">
          <div className="settings-grid">
            {/* Text Speed Slider */}
            <div className="settings-row">
              <span className="settings-label">글자 출력 속도 (Text Speed)</span>
              <div className="settings-control">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={textSpeed}
                  onChange={(e) => onTextSpeedChange(parseInt(e.target.value, 10))}
                  className="settings-slider"
                />
                <span style={{ minWidth: '45px', textAlign: 'right', fontWeight: 'bold' }}>
                  {textSpeed} CPS
                </span>
              </div>
            </div>

            {/* BGM Volume Slider (Stubbed) */}
            <div className="settings-row">
              <span className="settings-label">배경음 음량 (BGM Volume)</span>
              <div className="settings-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bgmVolume}
                  onChange={(e) => onBgmVolumeChange(parseInt(e.target.value, 10))}
                  className="settings-slider"
                />
                <span style={{ minWidth: '45px', textAlign: 'right', fontWeight: 'bold' }}>
                  {bgmVolume}%
                </span>
              </div>
            </div>

            {/* SFX Volume Slider (Stubbed) */}
            <div className="settings-row">
              <span className="settings-label">효과음 음량 (SFX Volume)</span>
              <div className="settings-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVolume}
                  onChange={(e) => onSfxVolumeChange(parseInt(e.target.value, 10))}
                  className="settings-slider"
                />
                <span style={{ minWidth: '45px', textAlign: 'right', fontWeight: 'bold' }}>
                  {sfxVolume}%
                </span>
              </div>
            </div>
            
            <div style={{ fontSize: '11px', color: 'var(--ash-grey-4)', marginTop: '10px', fontStyle: 'italic' }}>
              * 음량 조절은 인터페이스 규격과 연동되며, 현재 오디오 에셋은 연출 명령어(플레이스홀더)로 스터브 처리되어 동작합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
