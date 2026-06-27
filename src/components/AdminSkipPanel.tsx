import { ADMIN_DIALOGUE_SKIP_STEP, ADMIN_SCENE_SKIP_STEP } from '../engine/adminNavigation';
import { ADMIN_SKIP_TARGETS } from '../engine/sessionConstants';
import type { ScriptLabels } from '../engine/scriptLoader';

interface AdminSkipPanelProps {
  readonly currentIndex: number;
  readonly currentLabel: string;
  readonly scriptLabels: ScriptLabels;
  readonly onJumpByDialogueOffset: (offset: number) => void;
  readonly onJumpByOffset: (offset: number) => void;
  readonly onJumpToLabel: (label: string) => void;
}

export const AdminSkipPanel: React.FC<AdminSkipPanelProps> = ({
  currentIndex,
  currentLabel,
  scriptLabels,
  onJumpByDialogueOffset,
  onJumpByOffset,
  onJumpToLabel
}) => (
  <div className="admin-skip-panel" aria-label="Admin skip controls">
    <span className="admin-skip-label">{currentLabel}:{currentIndex}</span>
    <button type="button" onClick={() => onJumpByDialogueOffset(-1)}>이전</button>
    <button type="button" onClick={() => onJumpByDialogueOffset(-ADMIN_DIALOGUE_SKIP_STEP)}>
      대사 -10
    </button>
    <button type="button" onClick={() => onJumpByDialogueOffset(ADMIN_DIALOGUE_SKIP_STEP)}>
      대사 +10
    </button>
    <span className="admin-skip-divider" aria-hidden="true" />
    <button type="button" onClick={() => onJumpByOffset(-ADMIN_SCENE_SKIP_STEP)}>씬 -10</button>
    <button type="button" onClick={() => onJumpByOffset(ADMIN_SCENE_SKIP_STEP)}>씬 +10</button>
    <span className="admin-skip-divider" aria-hidden="true" />
    {ADMIN_SKIP_TARGETS.map((target) => (
      <button
        key={target.label}
        type="button"
        onClick={() => onJumpToLabel(target.label)}
        disabled={!scriptLabels[target.label]}
      >
        {target.name}
      </button>
    ))}
  </div>
);
