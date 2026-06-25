export interface AssetPreloadResult {
  readonly src: string;
  readonly ok: boolean;
}

interface ImagePreloadOptions {
  readonly timeoutMs: number;
}

const DEFAULT_IMAGE_TIMEOUT_MS = 7000;

export const INTRO_BG = 'snow_mountain_pass';

export const CRITICAL_INTRO_ASSETS = [
  '/assets/bg/snow_mountain_pass.png',
  '/assets/bg/forbidden_village.png',
  '/assets/char/ih_alert.png',
  '/assets/char/ih_neutral.png',
  '/assets/face/ih_alert.png',
  '/assets/face/ih_neutral.png'
] as const;

export const STORY_IMAGE_ASSETS = [
  '/assets/bg/abandoned_inn.png',
  '/assets/bg/forbidden_village.png',
  '/assets/bg/snow_mountain_pass.png',
  '/assets/bg/town_market.png',
  '/assets/char/cs_grim.png',
  '/assets/char/cs_neutral.png',
  '/assets/char/cs_resolve.png',
  '/assets/char/cs_suspicious.png',
  '/assets/char/dp_loyal.png',
  '/assets/char/dp_neutral.png',
  '/assets/char/dp_startled.png',
  '/assets/char/dp_wary.png',
  '/assets/char/hy_grief.png',
  '/assets/char/hy_neutral.png',
  '/assets/char/hy_plead.png',
  '/assets/char/hy_relief.png',
  '/assets/char/ih_alert.png',
  '/assets/char/ih_angry.png',
  '/assets/char/ih_anxious.png',
  '/assets/char/ih_neutral.png',
  '/assets/char/ih_protect.png',
  '/assets/char/ih_sad.png',
  '/assets/char/ih_serious.png',
  '/assets/char/ih_wounded.png',
  '/assets/char/sh_alert.png',
  '/assets/char/sh_anxious.png',
  '/assets/char/sh_flinch.png',
  '/assets/char/sh_neutral.png',
  '/assets/char/sh_numb.png',
  '/assets/char/sh_panic.png',
  '/assets/char/sh_soft.png',
  '/assets/char/sh_trance.png',
  '/assets/char/wh_neutral.png',
  '/assets/char/wh_omen.png',
  '/assets/char/wh_ritual.png',
  '/assets/char/wh_trance.png',
  '/assets/char/yg_alert.png',
  '/assets/char/yg_neutral.png',
  '/assets/face/cs_grim.png',
  '/assets/face/cs_neutral.png',
  '/assets/face/cs_resolve.png',
  '/assets/face/cs_suspicious.png',
  '/assets/face/dp_loyal.png',
  '/assets/face/dp_neutral.png',
  '/assets/face/dp_startled.png',
  '/assets/face/dp_wary.png',
  '/assets/face/hy_grief.png',
  '/assets/face/hy_neutral.png',
  '/assets/face/hy_plead.png',
  '/assets/face/hy_relief.png',
  '/assets/face/ih_alert.png',
  '/assets/face/ih_angry.png',
  '/assets/face/ih_anxious.png',
  '/assets/face/ih_neutral.png',
  '/assets/face/ih_protect.png',
  '/assets/face/ih_sad.png',
  '/assets/face/ih_serious.png',
  '/assets/face/ih_wounded.png',
  '/assets/face/sh_alert.png',
  '/assets/face/sh_anxious.png',
  '/assets/face/sh_flinch.png',
  '/assets/face/sh_neutral.png',
  '/assets/face/sh_numb.png',
  '/assets/face/sh_panic.png',
  '/assets/face/sh_soft.png',
  '/assets/face/sh_trance.png',
  '/assets/face/wh_neutral.png',
  '/assets/face/wh_omen.png',
  '/assets/face/wh_ritual.png',
  '/assets/face/wh_trance.png',
  '/assets/face/yg_alert.png',
  '/assets/face/yg_neutral.png'
] as const;

const uniqueAssets = (assets: readonly string[]): readonly string[] => Array.from(new Set(assets));

export const preloadImage = (
  src: string,
  options: ImagePreloadOptions = { timeoutMs: DEFAULT_IMAGE_TIMEOUT_MS }
): Promise<AssetPreloadResult> => {
  if (typeof Image === 'undefined') {
    return Promise.resolve({ src, ok: false });
  }

  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve({ src, ok: false });
    }, options.timeoutMs);

    img.onload = () => {
      window.clearTimeout(timer);
      resolve({ src, ok: true });
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      resolve({ src, ok: false });
    };

    img.decoding = 'async';
    img.src = src;
  });
};

export const preloadImages = async (
  assets: readonly string[],
  options: ImagePreloadOptions = { timeoutMs: DEFAULT_IMAGE_TIMEOUT_MS }
): Promise<readonly AssetPreloadResult[]> => {
  const preloadTasks = uniqueAssets(assets).map((asset) => preloadImage(asset, options));
  return Promise.all(preloadTasks);
};
