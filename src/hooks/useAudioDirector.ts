import { useCallback, useEffect, useRef } from 'react';
import { createAudioDirector } from '../engine/audio';
import type { AudioDirector } from '../engine/audio';

interface AudioControls {
  readonly unlockAudio: () => void;
  readonly playMusic: (audioId: string) => void;
  readonly stopMusic: () => void;
  readonly playSound: (audioId: string) => void;
  readonly stopSound: () => void;
}

export const useAudioDirector = (bgmVolume: number, sfxVolume: number): AudioControls => {
  const directorRef = useRef<AudioDirector | null>(null);

  const getDirector = useCallback((): AudioDirector => {
    if (!directorRef.current) {
      directorRef.current = createAudioDirector();
    }

    return directorRef.current;
  }, []);

  useEffect(() => {
    const director = getDirector();
    director.setBgmVolume(bgmVolume);
    director.setSfxVolume(sfxVolume);
  }, [bgmVolume, getDirector, sfxVolume]);

  useEffect(() => {
    const director = getDirector();
    return () => {
      director.dispose();
    };
  }, [getDirector]);

  return {
    unlockAudio: () => {
      void getDirector().unlock();
    },
    playMusic: (audioId: string) => {
      getDirector().playMusic(audioId);
    },
    stopMusic: () => {
      getDirector().stopMusic();
    },
    playSound: (audioId: string) => {
      getDirector().playSound(audioId);
    },
    stopSound: () => {
      getDirector().stopSound();
    }
  };
};
