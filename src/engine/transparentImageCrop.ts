interface OpaqueBounds {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

const findOpaqueBounds = (data: Uint8ClampedArray, width: number, height: number): OpaqueBounds | undefined => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alphaIndex = (y * width + x) * 4 + 3;
      if (data[alphaIndex] === 0) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || maxY < 0) return undefined;

  return {
    minX,
    minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
};

export const cropImageDataToOpaqueBounds = (source: ImageData): ImageData => {
  const bounds = findOpaqueBounds(source.data, source.width, source.height);
  if (!bounds) return source;

  const coversWholeImage = (
    bounds.minX === 0 &&
    bounds.minY === 0 &&
    bounds.width === source.width &&
    bounds.height === source.height
  );
  if (coversWholeImage) return source;

  const cropped = new ImageData(bounds.width, bounds.height);

  for (let y = 0; y < bounds.height; y += 1) {
    const sourceStart = ((bounds.minY + y) * source.width + bounds.minX) * 4;
    const sourceEnd = sourceStart + bounds.width * 4;
    const targetStart = y * bounds.width * 4;
    cropped.data.set(source.data.subarray(sourceStart, sourceEnd), targetStart);
  }

  return cropped;
};
