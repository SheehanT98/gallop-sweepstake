/** Rough BPM estimate from an audio file (browser only). */
export async function estimateBpmFromFile(file: File): Promise<number> {
  const ctx = new AudioContext();
  try {
    const buffer = await file.arrayBuffer();
    const audio = await ctx.decodeAudioData(buffer.slice(0));
    const bpm = estimateBpmFromBuffer(audio);
    return bpm;
  } catch {
    return 120;
  } finally {
    await ctx.close();
  }
}

export function estimateBpmFromBuffer(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const blockSize = Math.floor(sampleRate * 0.05);
  const peaks: number[] = [];

  for (let i = 0; i < data.length - blockSize; i += blockSize) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(data[i + j]);
    }
    peaks.push(sum / blockSize);
  }

  const threshold = peaks.reduce((a, b) => a + b, 0) / peaks.length;
  const onsetTimes: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    if (peaks[i] > threshold * 1.4 && peaks[i] > peaks[i - 1]) {
      onsetTimes.push((i * blockSize) / sampleRate);
    }
  }

  if (onsetTimes.length < 4) return 120;

  const intervals: number[] = [];
  for (let i = 1; i < onsetTimes.length; i++) {
    const d = onsetTimes[i] - onsetTimes[i - 1];
    if (d > 0.25 && d < 2) intervals.push(d);
  }
  if (!intervals.length) return 120;

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  let bpm = 60 / median;

  while (bpm < 80) bpm *= 2;
  while (bpm > 160) bpm /= 2;

  return Math.round(bpm);
}

export async function getAudioDurationSec(file: File): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement("audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      resolve(el.duration || 60);
      URL.revokeObjectURL(el.src);
    };
    el.onerror = () => resolve(60);
    el.src = URL.createObjectURL(file);
  });
}
