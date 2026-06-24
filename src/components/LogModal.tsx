import React, { useEffect, useRef } from 'react';
import type { LogItem } from '../engine/types';
import { X, BookOpen } from 'lucide-react';

interface LogModalProps {
  log: LogItem[];
  onClose: () => void;
}

export const LogModal: React.FC<LogModalProps> = ({ log, onClose }) => {
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom of the log on mount/update
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [log]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="modal-title">
          <BookOpen size={24} />
          대사 기록 (History Log)
        </h2>

        <div className="modal-body custom-scrollbar" style={{ maxHeight: '400px' }}>
          {log.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: 'var(--ash-grey-4)',
                fontStyle: 'italic'
              }}
            >
              기록된 대사가 없습니다.
            </div>
          ) : (
            <div className="log-list">
              {log.map((item, idx) => (
                <div key={idx} className="log-item">
                  {item.speaker !== '나레이션' && (
                    <div className="log-speaker">{item.speaker}</div>
                  )}
                  <div 
                    className="log-text"
                    style={{ 
                      fontStyle: item.speaker === '나레이션' ? 'italic' : 'normal',
                      color: item.speaker === '나레이션' ? 'var(--ash-grey-3)' : 'var(--ash-grey-1)'
                    }}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
