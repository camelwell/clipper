import { useEffect } from 'react'
import { usePlaybackStore } from '../stores/playbackStore'
import { onPlaybackTick } from '../utils/videoElement'

/**
 * Calls `onTime` whenever the displayed playhead time should change: every
 * animation frame while playing, and on each store update while paused
 * (seeks, scrubbing). Lets a component write the DOM directly instead of
 * re-rendering per tick.
 */
export function useSmoothTime(onTime: (time: number) => void): void {
  useEffect(() => {
    onTime(usePlaybackStore.getState().currentTime)

    const unsubStore = usePlaybackStore.subscribe((state, prev) => {
      if (!state.isPlaying && state.currentTime !== prev.currentTime) onTime(state.currentTime)
    })
    const unsubTick = onPlaybackTick(onTime)

    return () => {
      unsubStore()
      unsubTick()
    }
  }, [onTime])
}
