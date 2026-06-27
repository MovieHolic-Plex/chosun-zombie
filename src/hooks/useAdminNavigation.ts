import { useCallback } from 'react';
import {
  resolveAdminDialogueJump,
  resolveAdminLabelJump,
  resolveAdminSceneJump
} from '../engine/adminNavigation';
import type { ResolveResult } from '../engine/sessionRuntime';
import type { ScriptLabels } from '../engine/scriptLoader';
import type { GameVariables } from '../engine/types';

interface UseAdminNavigationRequest {
  readonly commitResolvedState: (result: ResolveResult) => void;
  readonly currentIndex: number;
  readonly currentLabel: string;
  readonly labels: ScriptLabels;
  readonly prepareJump: () => void;
  readonly variables: GameVariables;
}

export const useAdminNavigation = ({
  commitResolvedState,
  currentIndex,
  currentLabel,
  labels,
  prepareJump,
  variables
}: UseAdminNavigationRequest) => {
  const jumpToLabelForAdmin = useCallback((label: string) => {
    const result = resolveAdminLabelJump({ label, labels, variables });
    if (!result) return;
    prepareJump();
    commitResolvedState(result);
  }, [commitResolvedState, labels, prepareJump, variables]);

  const jumpByAdminOffset = useCallback((offset: number) => {
    const result = resolveAdminSceneJump({ currentLabel, labels, offset, variables });
    if (!result) return;
    prepareJump();
    commitResolvedState(result);
  }, [commitResolvedState, currentLabel, labels, prepareJump, variables]);

  const jumpByAdminDialogueOffset = useCallback((offset: number) => {
    const result = resolveAdminDialogueJump({
      currentIndex,
      currentLabel,
      labels,
      offset,
      variables
    });
    if (!result) return;
    prepareJump();
    commitResolvedState(result);
  }, [commitResolvedState, currentIndex, currentLabel, labels, prepareJump, variables]);

  return {
    jumpByAdminDialogueOffset,
    jumpByAdminOffset,
    jumpToLabelForAdmin
  };
};
