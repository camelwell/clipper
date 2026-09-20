import { usePlaybackStore } from '../stores/playbackStore'
import { clamp } from './clamp'

/**
 * Shared access to the single <video> element rendered by VideoPreview.
 *
 * Other components seek through these helpers rather than touching the
 * element directly. The playback store's `currentTime` is authoritative while
 * paused (it is set by every seek/scrub); the element is authoritative while
 * playing (see the ticker below).
 */

let videoEl: HTMLVideoElement | null = null
let pendingScrub: number | null = null

export function registerVideoElement(el: HTMLVideoElement | null): void {
  videoEl = el
  pendingScrub = null
}

export function getVideoElement(): HTMLVideoElement | null {
  return videoEl
}

/**
 * Where the playhead is right now, from whichever source is authoritative.
 * Decided by the element's own `paused` flag rather than the store's
 * `isPlaying`: a caller may have just set isPlaying=false and the pause
 * effect (which syncs the store from the element) hasn't run yet.
 */
export function getCurrentTime(): number {
  if (videoEl && !videoEl.paused) return videoEl.currentTime
  return usePlaybackStore.getState().currentTime
}

/** Discrete seek: keyboard, click, frame step. */
export function seekTo(time: number): void {
  pendingScrub = null
  usePlaybackStore.getState().setCurrentTime(time)
  if (videoEl) videoEl.currentTime = time
}

export function seekBy(delta: number, duration: number): void {
  seekTo(clamp(getCurrentTime() + delta, 0, duration))
}

/**
 * Continuous seek for scrubbing. At most one seek is in flight: while the
 * decoder is busy the latest requested time is parked and applied on `seeked`,
 * so a fast drag never queues a backlog of stale seeks behind the decoder.
 */
export function scrubTo(time: number): void {
  usePlaybackStore.getState().setCurrentTime(time)
  if (!videoEl) return
  if (videoEl.seeking) {
    pendingScrub = time
  } else {
    videoEl.currentTime = time
  }
}

/** Wired to the element's `seeked` event by VideoPreview. */
export function flushPendingScrub(): void {
  if (pendingScrub === null || !videoEl) return
  const time = pendingScrub
  pendingScrub = null
  videoEl.currentTime = time
}

// --- Playback ticker -------------------------------------------------------
// A single requestAnimationFrame loop that runs only while playing. Consumers
// (playhead, time readout, out-point enforcement) update the DOM directly from
// it, so playback causes no React re-renders at all.

type TickListener = (time: number) => void
const tickListeners = new Set<TickListener>()
let rafId = 0

function tick(): void {
  // Schedule first so a listener that stops the ticker cancels this frame
  rafId = requestAnimationFrame(tick)
  if (!videoEl) return
  const time = videoEl.currentTime
  tickListeners.forEach((listener) => listener(time))
}

export function startPlaybackTicker(): void {
  if (rafId === 0) rafId = requestAnimationFrame(tick)
}

export function stopPlaybackTicker(): void {
  cancelAnimationFrame(rafId)
  rafId = 0
}

export function onPlaybackTick(listener: TickListener): () => void {
  tickListeners.add(listener)
  return () => {
    tickListeners.delete(listener)
  }
}
