const CANVAS_SIZE = 256;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to load selected image."));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });
}

export async function extractXrayFeatures(file) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const { data } = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const pixelCount = CANVAS_SIZE * CANVAS_SIZE;

  let sum = 0;
  let sumSq = 0;
  let darkCount = 0;
  let brightCount = 0;
  let edgeSum = 0;
  let centerSum = 0;
  let centerCount = 0;
  let lowerSum = 0;
  let lowerCount = 0;
  let upperSum = 0;
  let upperCount = 0;
  let leftSum = 0;
  let rightSum = 0;
  let leftCount = 0;
  let rightCount = 0;
  let peripheralSum = 0;
  let peripheralCount = 0;
  let lowerLeftSum = 0;
  let lowerLeftCount = 0;
  let lowerRightSum = 0;
  let lowerRightCount = 0;

  const gray = new Float32Array(pixelCount);

  for (let y = 0; y < CANVAS_SIZE; y += 1) {
    for (let x = 0; x < CANVAS_SIZE; x += 1) {
      const idx = y * CANVAS_SIZE + x;
      const base = idx * 4;
      const r = data[base];
      const g = data[base + 1];
      const b = data[base + 2];
      const value = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      gray[idx] = value;
      sum += value;
      sumSq += value * value;

      if (value < 0.35) darkCount += 1;
      if (value > 0.7) brightCount += 1;

      const inCenterX = x >= 64 && x < 192;
      const inCenterY = y >= 56 && y < 208;
      const inPeripheral = x < 48 || x >= 208 || y < 40 || y >= 216;
      const inLower = y >= 128;
      const inUpper = y < 128;
      const inLeft = x < 128;
      const inRight = x >= 128;
      const inLowerBand = y >= 144;

      if (inCenterX && inCenterY) {
        centerSum += value;
        centerCount += 1;
      }
      if (inPeripheral) {
        peripheralSum += value;
        peripheralCount += 1;
      }
      if (inLower) {
        lowerSum += value;
        lowerCount += 1;
      }
      if (inUpper) {
        upperSum += value;
        upperCount += 1;
      }
      if (inLeft) {
        leftSum += value;
        leftCount += 1;
      }
      if (inRight) {
        rightSum += value;
        rightCount += 1;
      }
      if (inLowerBand && inLeft) {
        lowerLeftSum += value;
        lowerLeftCount += 1;
      }
      if (inLowerBand && inRight) {
        lowerRightSum += value;
        lowerRightCount += 1;
      }
    }
  }

  for (let y = 0; y < CANVAS_SIZE - 1; y += 1) {
    for (let x = 0; x < CANVAS_SIZE - 1; x += 1) {
      const idx = y * CANVAS_SIZE + x;
      const right = gray[idx + 1];
      const down = gray[idx + CANVAS_SIZE];
      edgeSum += Math.abs(gray[idx] - right) + Math.abs(gray[idx] - down);
    }
  }

  const mean = sum / pixelCount;
  const variance = Math.max(0, sumSq / pixelCount - mean * mean);
  const contrast = Math.sqrt(variance);
  const leftMean = leftSum / Math.max(1, leftCount);
  const rightMean = rightSum / Math.max(1, rightCount);

  return {
    width: image.naturalWidth || CANVAS_SIZE,
    height: image.naturalHeight || CANVAS_SIZE,
    mean_intensity: Number(mean.toFixed(6)),
    contrast: Number(contrast.toFixed(6)),
    edge_density: Number((edgeSum / ((CANVAS_SIZE - 1) * (CANVAS_SIZE - 1) * 2)).toFixed(6)),
    dark_ratio: Number((darkCount / pixelCount).toFixed(6)),
    bright_ratio: Number((brightCount / pixelCount).toFixed(6)),
    center_mean: Number((centerSum / Math.max(1, centerCount)).toFixed(6)),
    peripheral_mean: Number((peripheralSum / Math.max(1, peripheralCount)).toFixed(6)),
    upper_mean: Number((upperSum / Math.max(1, upperCount)).toFixed(6)),
    lower_mean: Number((lowerSum / Math.max(1, lowerCount)).toFixed(6)),
    left_mean: Number(leftMean.toFixed(6)),
    right_mean: Number(rightMean.toFixed(6)),
    symmetry_score: Number(clamp(1 - Math.abs(leftMean - rightMean) * 2.8).toFixed(6)),
    lower_left_mean: Number((lowerLeftSum / Math.max(1, lowerLeftCount)).toFixed(6)),
    lower_right_mean: Number((lowerRightSum / Math.max(1, lowerRightCount)).toFixed(6)),
  };
}

export async function buildXrayFormData(file, patientId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("patient_id", patientId || "");

  try {
    const imageFeatures = await extractXrayFeatures(file);
    formData.append("image_features", JSON.stringify(imageFeatures));
  } catch (error) {
    console.warn("Falling back to upload without extracted X-ray features:", error);
  }

  return formData;
}
