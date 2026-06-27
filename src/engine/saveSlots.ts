import type { SaveSlot } from './types';

const hasSaveSlotShape = (value: unknown): value is SaveSlot => (
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'date' in value &&
  'variables' in value &&
  'currentLabel' in value &&
  'currentIndex' in value &&
  'shownCharacters' in value &&
  'currentBg' in value &&
  'activeEffects' in value
);

export const createEmptySaveSlots = (): { [slotId: number]: SaveSlot | null } => ({
  1: null,
  2: null,
  3: null,
  4: null
});

export const readSaveSlots = (): { [slotId: number]: SaveSlot | null } => {
  const loadedSlots = createEmptySaveSlots();
  for (let slotId = 1; slotId <= 4; slotId++) {
    const savedData = localStorage.getItem(`yeokgwi_save_slot_${slotId}`);
    if (savedData) {
      try {
        const parsed: unknown = JSON.parse(savedData);
        if (hasSaveSlotShape(parsed)) {
          loadedSlots[slotId] = parsed;
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }
      }
    }
  }
  return loadedSlots;
};

export const findLatestSaveSlot = (
  saveSlots: { [slotId: number]: SaveSlot | null }
): SaveSlot | null => (
  Object.values(saveSlots)
    .filter((slot): slot is SaveSlot => slot !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null
);
