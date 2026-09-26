// zzfx ships without TypeScript types; this describes the parts the game uses.
declare module 'zzfx' {
  /** Sound "recipe": volume, randomness, frequency, attack, sustain, release, shape, … */
  export type ZzfxParams = (number | undefined)[];

  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    play(...parameters: ZzfxParams): AudioBufferSourceNode;
  };

  export function zzfx(...parameters: ZzfxParams): AudioBufferSourceNode;
}
