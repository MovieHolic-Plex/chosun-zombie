export interface AudioDirector {
  readonly unlock: () => Promise<void>;
  readonly playMusic: (audioId: string) => void;
  readonly stopMusic: () => void;
  readonly playSound: (audioId: string) => void;
  readonly stopSound: () => void;
  readonly setBgmVolume: (volume: number) => void;
  readonly setSfxVolume: (volume: number) => void;
  readonly dispose: () => void;
}

declare global {
  interface Window {
    readonly webkitAudioContext?: typeof AudioContext;
  }
}

interface ActiveProceduralMusic {
  readonly id: string;
  readonly stop: () => void;
}

interface AudioGraph {
  readonly context: AudioContext;
  readonly bgmGain: GainNode;
  readonly sfxGain: GainNode;
}

const clampVolume = (volume: number): number => Math.min(100, Math.max(0, volume));

const volumeToGain = (volume: number): number => {
  const normalized = clampVolume(volume) / 100;
  return normalized * normalized;
};

const createNoiseBuffer = (context: AudioContext, durationSeconds: number): AudioBuffer => {
  const frameCount = Math.floor(context.sampleRate * durationSeconds);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  return buffer;
};

const createWindySnowMusic = (
  context: AudioContext,
  output: AudioNode
): ActiveProceduralMusic => {
  const noise = context.createBufferSource();
  noise.buffer = createNoiseBuffer(context, 2);
  noise.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.6;

  const windGain = context.createGain();
  windGain.gain.value = 0.18;

  const gustOscillator = context.createOscillator();
  gustOscillator.type = 'sine';
  gustOscillator.frequency.value = 0.08;

  const gustDepth = context.createGain();
  gustDepth.gain.value = 0.07;

  const lowWind = context.createOscillator();
  lowWind.type = 'sine';
  lowWind.frequency.value = 74;

  const lowWindGain = context.createGain();
  lowWindGain.gain.value = 0.018;

  noise.connect(filter);
  filter.connect(windGain);
  windGain.connect(output);
  gustOscillator.connect(gustDepth);
  gustDepth.connect(windGain.gain);
  lowWind.connect(lowWindGain);
  lowWindGain.connect(output);

  noise.start();
  gustOscillator.start();
  lowWind.start();

  return {
    id: 'windy_snow',
    stop: () => {
      noise.stop();
      gustOscillator.stop();
      lowWind.stop();
      noise.disconnect();
      filter.disconnect();
      windGain.disconnect();
      gustOscillator.disconnect();
      gustDepth.disconnect();
      lowWind.disconnect();
      lowWindGain.disconnect();
    }
  };
};

export const createAudioDirector = (): AudioDirector => {
  let graph: AudioGraph | null = null;
  let bgmVolume = 50;
  let sfxVolume = 50;
  let currentMusic: ActiveProceduralMusic | null = null;

  const ensureGraph = (): AudioGraph | null => {
    if (graph) {
      return graph;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    const context = new AudioContextCtor();
    const bgmGain = context.createGain();
    const sfxGain = context.createGain();
    bgmGain.gain.value = volumeToGain(bgmVolume);
    sfxGain.gain.value = volumeToGain(sfxVolume);
    bgmGain.connect(context.destination);
    sfxGain.connect(context.destination);

    graph = { context, bgmGain, sfxGain };
    return graph;
  };

  const stopMusic = () => {
    currentMusic?.stop();
    currentMusic = null;
  };

  return {
    unlock: async () => {
      const currentGraph = ensureGraph();
      if (currentGraph?.context.state === 'suspended') {
        await currentGraph.context.resume();
      }
    },
    playMusic: (audioId: string) => {
      const currentGraph = ensureGraph();
      if (!currentGraph || currentMusic?.id === audioId) {
        return;
      }

      stopMusic();

      if (audioId === 'windy_snow') {
        currentMusic = createWindySnowMusic(currentGraph.context, currentGraph.bgmGain);
      }
    },
    stopMusic,
    playSound: (audioId: string) => {
      const currentGraph = ensureGraph();
      if (!currentGraph) {
        return;
      }

      if (audioId === 'click') {
        const oscillator = currentGraph.context.createOscillator();
        const gain = currentGraph.context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.value = 520;
        gain.gain.setValueAtTime(0.06, currentGraph.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentGraph.context.currentTime + 0.08);
        oscillator.connect(gain);
        gain.connect(currentGraph.sfxGain);
        oscillator.start();
        oscillator.stop(currentGraph.context.currentTime + 0.08);
      }
    },
    stopSound: () => {},
    setBgmVolume: (volume: number) => {
      bgmVolume = clampVolume(volume);
      const currentGraph = ensureGraph();
      if (currentGraph) {
        currentGraph.bgmGain.gain.value = volumeToGain(bgmVolume);
      }
    },
    setSfxVolume: (volume: number) => {
      sfxVolume = clampVolume(volume);
      const currentGraph = ensureGraph();
      if (currentGraph) {
        currentGraph.sfxGain.gain.value = volumeToGain(sfxVolume);
      }
    },
    dispose: () => {
      stopMusic();
      void graph?.context.close();
      graph = null;
    }
  };
};
