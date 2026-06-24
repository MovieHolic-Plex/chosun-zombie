import React from 'react';
import type { SaveSlot } from '../engine/types';
import { X, Save, FolderOpen } from 'lucide-react';

interface SaveLoadModalProps {
  mode: 'save' | 'load';
  slots: { [slotId: number]: SaveSlot | null };
  onClose: () => void;
  onSlotAction: (slotId: number) => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  mode,
  slots,
  onClose,
  onSlotAction
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="modal-title">
          {mode === 'save' ? <Save size={24} /> : <FolderOpen size={24} />}
          {mode === 'save' ? '기록 저장 (Save)' : '기록 불러오기 (Load)'}
        </h2>

        <div className="modal-body custom-scrollbar">
          <div className="save-slots-grid">
            {[1, 2, 3, 4].map((slotId) => {
              const slot = slots[slotId];

              return (
                <div
                  key={slotId}
                  className="save-slot-card brush-border"
                  onClick={() => {
                    if (mode === 'save' || slot) {
                      onSlotAction(slotId);
                    }
                  }}
                  style={{
                    cursor: (mode === 'load' && !slot) ? 'not-allowed' : 'pointer',
                    opacity: (mode === 'load' && !slot) ? 0.6 : 1
                  }}
                >
                  <div className="save-slot-header">
                    <span>수포 제 {slotId} 첩 (슬롯 {slotId})</span>
                    {slot && <span className="save-slot-date">{slot.date}</span>}
                  </div>

                  {slot ? (
                    <>
                      <div className="save-slot-desc">
                        <strong>[{slot.sceneTitle}]</strong> {slot.lineText}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ash-grey-3)', marginTop: '5px' }}>
                        신뢰: {slot.variables.trust_girl} | 인간성: {slot.variables.humanity} | 의심: {slot.variables.suspicion}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '70px',
                        color: 'var(--ash-grey-4)',
                        fontSize: '14px',
                        fontStyle: 'italic'
                      }}
                    >
                      — 비어 있는 서첩 —
                    </div>
                  )}

                  <div className="save-slot-actions">
                    <button
                      className="joseon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mode === 'save' || slot) {
                          onSlotAction(slotId);
                        }
                      }}
                      disabled={mode === 'load' && !slot}
                    >
                      {mode === 'save' ? '기록하기' : '불러오기'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
