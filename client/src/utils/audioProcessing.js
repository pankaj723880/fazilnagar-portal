/**
 * audioProcessing.js
 * In-browser Web Audio API utilities for decoding, waveform extraction,
 * non-destructive trimming, middle-cut splicing, and 16-bit PCM WAV encoding.
 */

/**
 * Format seconds into mm:ss or mm:ss.d
 */
export function formatAudioTime(seconds, includeDecimals = false) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, "0");

  if (includeDecimals) {
    const tenths = Math.floor((seconds % 1) * 10);
    return `${pad(mins)}:${pad(secs)}.${tenths}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Decode an audio Blob or ArrayBuffer into an AudioBuffer using AudioContext
 */
export async function decodeAudioBlob(blobOrBuffer) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Web Audio API is not supported in this browser.");
  }
  const ctx = new AudioCtx();

  let arrayBuffer;
  if (blobOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = blobOrBuffer;
  } else if (blobOrBuffer instanceof Blob) {
    arrayBuffer = await blobOrBuffer.arrayBuffer();
  } else {
    throw new Error("Invalid input: must be Blob or ArrayBuffer");
  }

  try {
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return decodedBuffer;
  } finally {
    if (ctx.state !== "closed") {
      ctx.close().catch(() => {});
    }
  }
}

/**
 * Extract normalized waveform peak values (0 to 1) for visualization
 */
export function extractWaveformPeaks(audioBuffer, barCount = 100) {
  if (!audioBuffer) return new Array(barCount).fill(0.1);

  const rawData = audioBuffer.getChannelData(0); // primary channel
  const totalSamples = rawData.length;
  const blockSize = Math.floor(totalSamples / barCount);
  const peaks = [];

  for (let i = 0; i < barCount; i++) {
    const start = i * blockSize;
    let sum = 0;
    let max = 0;
    const end = Math.min(start + blockSize, totalSamples);

    for (let j = start; j < end; j++) {
      const val = Math.abs(rawData[j]);
      sum += val;
      if (val > max) max = val;
    }

    // Blend peak and RMS for pleasing aesthetic waveform
    const count = end - start || 1;
    const avg = sum / count;
    const value = Math.min(1, max * 0.7 + avg * 0.3 * 2.5);
    peaks.push(Math.max(0.06, value)); // Minimum height for visual baseline
  }

  return peaks;
}

/**
 * Trim start and end of an AudioBuffer
 * Returns a new AudioBuffer with only the interval [startSec, endSec]
 */
export function trimAudioBuffer(audioBuffer, startSec, endSec) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const totalDuration = audioBuffer.duration;

  const validStart = Math.max(0, Math.min(startSec, totalDuration));
  const validEnd = Math.min(totalDuration, Math.max(validStart + 0.5, endSec));

  const startSample = Math.floor(validStart * sampleRate);
  const endSample = Math.floor(validEnd * sampleRate);
  const newLength = Math.max(1, endSample - startSample);

  const newBuffer = ctx.createBuffer(numChannels, newLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const srcChannel = audioBuffer.getChannelData(ch);
    const dstChannel = newBuffer.getChannelData(ch);
    for (let i = 0; i < newLength; i++) {
      dstChannel[i] = srcChannel[startSample + i] || 0;
    }
  }

  if (ctx.state !== "closed") {
    ctx.close().catch(() => {});
  }

  return newBuffer;
}

/**
 * Remove a middle segment [cutStartSec, cutEndSec] and splice the remaining parts together
 */
export function spliceCutAudioBuffer(audioBuffer, cutStartSec, cutEndSec) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const totalDuration = audioBuffer.duration;

  const validCutStart = Math.max(0, Math.min(cutStartSec, totalDuration));
  const validCutEnd = Math.min(totalDuration, Math.max(validCutStart, cutEndSec));

  const cutStartSample = Math.floor(validCutStart * sampleRate);
  const cutEndSample = Math.floor(validCutEnd * sampleRate);

  const part1Length = cutStartSample;
  const part2Length = Math.max(0, audioBuffer.length - cutEndSample);
  const newLength = part1Length + part2Length;

  if (newLength <= 0) {
    throw new Error("Cannot cut entire audio. Remaining audio duration must be greater than zero.");
  }

  const newBuffer = ctx.createBuffer(numChannels, newLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const srcChannel = audioBuffer.getChannelData(ch);
    const dstChannel = newBuffer.getChannelData(ch);

    // Copy part 1 (before cut)
    for (let i = 0; i < part1Length; i++) {
      dstChannel[i] = srcChannel[i];
    }
    // Copy part 2 (after cut) with subtle 5ms crossfade at splice boundary to avoid audio clicks
    const crossfadeSamples = Math.min(Math.floor(sampleRate * 0.005), part1Length, part2Length);
    for (let i = 0; i < part2Length; i++) {
      dstChannel[part1Length + i] = srcChannel[cutEndSample + i];
    }

    if (crossfadeSamples > 0) {
      for (let i = 0; i < crossfadeSamples; i++) {
        const factor = i / crossfadeSamples;
        const targetIdx = part1Length - crossfadeSamples + i;
        if (targetIdx >= 0 && targetIdx < newLength) {
          dstChannel[targetIdx] = dstChannel[targetIdx] * (1 - factor * 0.2);
        }
      }
    }
  }

  if (ctx.state !== "closed") {
    ctx.close().catch(() => {});
  }

  return newBuffer;
}

/**
 * Encode an AudioBuffer into standard 16-bit PCM WAV Blob
 */
export function bufferToWavBlob(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* RIFF chunk length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channelData = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}
