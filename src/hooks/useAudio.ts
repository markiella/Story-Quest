/**
 * useAudio — React hook providing stable bindings to the AudioService singleton.
 *
 * Returns the singleton directly. All methods on `audioService` are bound to
 * the instance and are therefore stable references — safe to use as event
 * handlers without wrapping in useCallback.
 *
 * Components must NOT import audioService directly — always use this hook
 * so the indirection layer is easy to swap in tests.
 */

import { audioService } from '../services/audioService';
export type { AudioSettings, NarrationState, ScreenMusic } from '../services/audioService';

export function useAudio() {
  // Return the singleton — its methods are stable instance references.
  // The hook exists as the single sanctioned import point, keeping
  // components decoupled from the concrete service class.
  return audioService;
}
