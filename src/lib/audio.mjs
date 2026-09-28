export const SAMPLE_RATE = 24000;
export const MAX_SECONDS = 30;

function number(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}

export function validateRecipe(recipe) {
  number(recipe.duration, 0.05, 10, 'duration');
  if (!Array.isArray(recipe.layers) || !recipe.layers.length || recipe.layers.length > 8) throw new Error('Expected 1–8 layers');
  for (const layer of recipe.layers) {
    if (!['tone', 'noise'].includes(layer.kind)) throw new Error('Invalid layer kind');
    number(layer.frequency, 30, 8000, 'frequency');
    number(layer.gain, 0, 1, 'gain');
    number(layer.decay, 0.02, 10, 'decay');
    number(layer.attack, 0.001, 2, 'attack');
    number(layer.pulses, 1, 20, 'pulses');
    if (!Number.isInteger(layer.pulses)) throw new Error('Pulses must be an integer');
  }
  return recipe;
}

export function renderRecipe(recipe, sampleRate = SAMPLE_RATE) {
  validateRecipe(recipe);
  number(sampleRate, 8000, 96000, 'sample rate');
  const out = new Float32Array(Math.ceil(recipe.duration * sampleRate));
  recipe.layers.forEach((layer, layerIndex) => {
    let seed = (1729 + layerIndex * 104729) >>> 0;
    let filtered = 0;
    const alpha = 1 - Math.exp(-2 * Math.PI * Math.min(layer.frequency, sampleRate * 0.45) / sampleRate);
    const period = recipe.duration / layer.pulses;
    for (let i = 0; i < out.length; i++) {
      const time = i / sampleRate;
      const local = time % period;
      const envelope = Math.min(1, local / layer.attack) * Math.exp(-local / layer.decay) * Math.min(1, (recipe.duration - time) / 0.02);
      let wave;
      if (layer.kind === 'noise') {
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        const white = (seed / 4294967296) * 2 - 1;
        filtered += alpha * (white - filtered);
        wave = filtered;
      } else {
        const fundamental = 2 * Math.PI * Math.min(layer.frequency, sampleRate * 0.2) * local;
        wave = Math.sin(fundamental) * 0.7 + Math.sin(fundamental * 2.37) * 0.3;
      }
      out[i] += wave * envelope * layer.gain / recipe.layers.length;
    }
  });
  return out;
}

export function renderScene(cues, recipeMap, sampleRate = SAMPLE_RATE) {
  if (!Array.isArray(cues) || !cues.length || cues.length > 16) throw new Error('Expected 1–16 cues');
  let end = 0;
  const rendered = cues.map(cue => {
    number(cue.at, 0, MAX_SECONDS, 'cue time');
    number(cue.level, 0, 1, 'cue level');
    const recipe = recipeMap.get(cue.recipeId);
    if (!recipe) throw new Error(`Missing recipe: ${cue.recipeId}`);
    const audio = renderRecipe(recipe, sampleRate);
    const offset = Math.round(cue.at * sampleRate);
    end = Math.max(end, offset + audio.length);
    if (end > sampleRate * MAX_SECONDS) throw new Error('Scene exceeds 30 seconds');
    return {audio, offset, level: cue.level};
  });
  const out = new Float32Array(end);
  for (const {audio, offset, level} of rendered) for (let i = 0; i < audio.length; i++) out[offset + i] += audio[i] * level;
  let peak = 0;
  for (const sample of out) peak = Math.max(peak, Math.abs(sample));
  const scale = peak > 0.85 ? 0.85 / peak : 1;
  if (scale !== 1) for (let i = 0; i < out.length; i++) out[i] *= scale;
  return out;
}

export function encodeWav(samples, sampleRate = SAMPLE_RATE) {
  if (!(samples instanceof Float32Array) || samples.length > sampleRate * MAX_SECONDS) throw new Error('Invalid audio buffer');
  number(sampleRate, 8000, 96000, 'sample rate');
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) throw new Error('Non-finite audio sample');
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(s * (s < 0 ? 32768 : 32767)), true);
  }
  return bytes;
}
