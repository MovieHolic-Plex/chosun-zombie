import { useState, useEffect } from 'react';
import { cropImageDataToOpaqueBounds } from '../engine/transparentImageCrop';

const transparentCache = new Map<string, string>();
const transparentPending = new Map<string, Promise<string>>();

interface TransparentPreloadOptions {
  readonly threshold?: number;
  readonly batchSize?: number;
  readonly batchDelayMs?: number;
}

const EMPTY_IMAGE_SRC = '';

const isRecoverableCanvasError = (error: unknown): error is DOMException => (
  typeof DOMException !== 'undefined' && error instanceof DOMException
);

const getCachedTransparentImage = (src: string): string | undefined => {
  if (!transparentCache.has(src)) return undefined;
  return transparentCache.get(src);
};

const processTransparentImage = (src: string, threshold: number): Promise<string> => {
  if (!src || typeof Image === 'undefined') {
    return Promise.resolve(EMPTY_IMAGE_SRC);
  }

  const cached = getCachedTransparentImage(src);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  const pending = transparentPending.get(src);
  if (pending) {
    return pending;
  }

  const task = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          transparentCache.set(src, EMPTY_IMAGE_SRC);
          resolve(EMPTY_IMAGE_SRC);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const width = imgData.width;
        const height = imgData.height;

        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const isMagentaFringe = (r: number, g: number, b: number) => (
          r > 80 && b > 80 && g < 95 && (r + b) > g * 3 && Math.abs(r - b) < 150
        );

        const isBgColor = (r: number, g: number, b: number) => {
          const dr = r - bgR;
          const dg = g - bgG;
          const db = b - bgB;
          const isCloseToBorderColor = Math.sqrt(dr * dr + dg * dg + db * db) < threshold;
          return isCloseToBorderColor || isMagentaFringe(r, g, b);
        };

        const isTransparentOrBg = (pixelIndex: number): boolean => {
          const base = pixelIndex * 4;
          if (data[base + 3] < 250) return true;
          return isBgColor(data[base], data[base + 1], data[base + 2]);
        };

        for (let x = 0; x < width; x++) {
          const idxTop = x;
          if (isTransparentOrBg(idxTop)) {
            visited[idxTop] = 1;
            queue.push(idxTop);
          }

          const idxBottom = (height - 1) * width + x;
          if (isTransparentOrBg(idxBottom)) {
            visited[idxBottom] = 1;
            queue.push(idxBottom);
          }
        }

        for (let y = 0; y < height; y++) {
          const idxLeft = y * width;
          if (!visited[idxLeft] && isTransparentOrBg(idxLeft)) {
            visited[idxLeft] = 1;
            queue.push(idxLeft);
          }

          const idxRight = y * width + (width - 1);
          if (!visited[idxRight] && isTransparentOrBg(idxRight)) {
            visited[idxRight] = 1;
            queue.push(idxRight);
          }
        }

        let head = 0;
        while (head < queue.length) {
          const idx = queue[head++];
          const x = idx % width;
          const y = Math.floor(idx / width);

          data[idx * 4 + 3] = 0;

          const neighbors = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1]
          ];

          for (let i = 0; i < neighbors.length; i++) {
            const nx = neighbors[i][0];
            const ny = neighbors[i][1];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (!visited[nidx]) {
                if (isTransparentOrBg(nidx)) {
                  visited[nidx] = 1;
                  queue.push(nidx);
                }
              }
            }
          }
        }

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0 && isMagentaFringe(data[i], data[i + 1], data[i + 2])) {
            data[i + 3] = 0;
          }
        }

        const croppedImageData = cropImageDataToOpaqueBounds(imgData);
        canvas.width = croppedImageData.width;
        canvas.height = croppedImageData.height;
        ctx.putImageData(croppedImageData, 0, 0);
        const dataUrl = canvas.toDataURL();
        transparentCache.set(src, dataUrl);
        resolve(dataUrl);
      } catch (error) {
        if (!isRecoverableCanvasError(error)) {
          throw error;
        }
        transparentCache.set(src, EMPTY_IMAGE_SRC);
        resolve(EMPTY_IMAGE_SRC);
      }
    };
    img.onerror = () => {
      transparentCache.set(src, EMPTY_IMAGE_SRC);
      resolve(EMPTY_IMAGE_SRC);
    };
    img.src = src;
  }).finally(() => {
    transparentPending.delete(src);
  });

  transparentPending.set(src, task);
  return task;
};

export const preloadTransparentImages = async (
  sources: readonly string[],
  options: TransparentPreloadOptions = {}
): Promise<readonly string[]> => {
  const threshold = options.threshold ?? 40;
  const batchSize = Math.max(1, options.batchSize ?? 3);
  const batchDelayMs = Math.max(0, options.batchDelayMs ?? 0);
  const uniqueSources = Array.from(new Set(sources));
  const results: string[] = [];

  for (let start = 0; start < uniqueSources.length; start += batchSize) {
    const batch = uniqueSources.slice(start, start + batchSize);
    const batchResults = await Promise.all(batch.map((src) => processTransparentImage(src, threshold)));
    results.push(...batchResults);
    if (batchDelayMs > 0 && start + batchSize < uniqueSources.length) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, batchDelayMs);
      });
    }
  }

  return results;
};

export const useTransparentImage = (src: string, threshold = 40): string => {
  const [processedSrc, setProcessedSrc] = useState<string>(() => getCachedTransparentImage(src) ?? EMPTY_IMAGE_SRC);

  useEffect(() => {
    if (!src) {
      setProcessedSrc(EMPTY_IMAGE_SRC);
      return;
    }

    const cached = getCachedTransparentImage(src);
    if (cached !== undefined) {
      setProcessedSrc(cached);
      return;
    }

    setProcessedSrc(EMPTY_IMAGE_SRC);
    let alive = true;
    processTransparentImage(src, threshold).then((nextSrc) => {
      if (alive) {
        setProcessedSrc(nextSrc);
      }
    });
    return () => {
      alive = false;
    };
  }, [src, threshold]);

  return processedSrc;
};
