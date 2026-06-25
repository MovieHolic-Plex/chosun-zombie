import { useState, useEffect } from 'react';

const transparentCache = new Map<string, string>();

export const useTransparentImage = (src: string, threshold = 40): string => {
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  useEffect(() => {
    if (!src) {
      setProcessedSrc('');
      return;
    }

    if (transparentCache.has(src)) {
      setProcessedSrc(transparentCache.get(src)!);
      return;
    }

    // Set fallback to original src while processing
    setProcessedSrc(src);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setProcessedSrc(src);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const width = imgData.width;
        const height = imgData.height;

        let hasUsefulAlpha = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 250) {
            hasUsefulAlpha = true;
            break;
          }
        }

        if (hasUsefulAlpha) {
          transparentCache.set(src, src);
          setProcessedSrc(src);
          return;
        }

        // Sample background color from top-left pixel (0, 0)
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        // Helper to check if pixel color is close to background color
        const isBgColor = (r: number, g: number, b: number) => {
          const dr = r - bgR;
          const dg = g - bgG;
          const db = b - bgB;
          return Math.sqrt(dr * dr + dg * dg + db * db) < threshold;
        };

        // Enqueue all border pixels that match background color
        for (let x = 0; x < width; x++) {
          // Top border
          const idxTop = x;
          if (isBgColor(data[idxTop * 4], data[idxTop * 4 + 1], data[idxTop * 4 + 2])) {
            visited[idxTop] = 1;
            queue.push(idxTop);
          }
          // Bottom border
          const idxBottom = (height - 1) * width + x;
          if (isBgColor(data[idxBottom * 4], data[idxBottom * 4 + 1], data[idxBottom * 4 + 2])) {
            visited[idxBottom] = 1;
            queue.push(idxBottom);
          }
        }
        for (let y = 0; y < height; y++) {
          // Left border
          const idxLeft = y * width;
          if (!visited[idxLeft] && isBgColor(data[idxLeft * 4], data[idxLeft * 4 + 1], data[idxLeft * 4 + 2])) {
            visited[idxLeft] = 1;
            queue.push(idxLeft);
          }
          // Right border
          const idxRight = y * width + (width - 1);
          if (!visited[idxRight] && isBgColor(data[idxRight * 4], data[idxRight * 4 + 1], data[idxRight * 4 + 2])) {
            visited[idxRight] = 1;
            queue.push(idxRight);
          }
        }

        // BFS flood fill from the borders
        let head = 0;
        while (head < queue.length) {
          const idx = queue[head++];
          const x = idx % width;
          const y = Math.floor(idx / width);

          // Set pixel to transparent
          data[idx * 4 + 3] = 0;

          // Check 4-way neighbors
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
                const r = data[nidx * 4];
                const g = data[nidx * 4 + 1];
                const b = data[nidx * 4 + 2];
                if (isBgColor(r, g, b)) {
                  visited[nidx] = 1;
                  queue.push(nidx);
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL();
        transparentCache.set(src, dataUrl);
        setProcessedSrc(dataUrl);
      } catch (e) {
        console.error('Error processing transparent image:', e);
        setProcessedSrc(src); // fallback
      }
    };
    img.onerror = () => {
      setProcessedSrc(src);
    };
    img.src = src;
  }, [src, threshold]);

  return processedSrc;
};
