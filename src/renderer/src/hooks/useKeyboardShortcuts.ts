import { useEffect } from 'react'
import { useVideoStore } from '../stores/videoStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useTrimStore } from '../stores/trimStore'
import { useFileNavStore } from '../stores/fileNavStore'
import { useUIStore } from '../stores/uiStore'
import { seekTo, seekBy, getCurrentTime } from '../utils/videoElement'
import { openVideoDialog, closeVideo } from '../utils/openVideo'
import { clamp } from '../utils/clamp'

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      // Skip when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const { duration, fps, filePath } = useVideoStore.getState()
      const { isPlaying, volume } = usePlaybackStore.getState()
      const { trimStart, trimEnd } = useTrimStore.getState()

      switch (true) {
        // Play/Pause
        case e.code === 'Space' && !e.ctrlKey && !e.altKey: {
          e.preventDefault()
          if (!filePath) return
          usePlaybackStore.getState().togglePlay()
          break
        }

        // Frame step forward
        case e.key === '.' && !e.ctrlKey && !e.altKey: {
          e.preventDefault()
          if (!filePath) return
          if (isPlaying) usePlaybackStore.getState().setIsPlaying(false)
          seekBy(1 / fps, duration)
          break
        }

        // Frame step backward
        case e.key === ',' && !e.ctrlKey && !e.altKey && !e.shiftKey: {
          e.preventDefault()
          if (!filePath) return
          if (isPlaying) usePlaybackStore.getState().setIsPlaying(false)
          seekBy(-1 / fps, duration)
          break
        }

        // Seek forward 5s
        case e.key === 'ArrowRight' && !e.ctrlKey && !e.altKey && !e.shiftKey: {
          e.preventDefault()
          if (!filePath) return
          seekBy(5, duration)
          break
        }

        // Seek backward 5s
        case e.key === 'ArrowLeft' && !e.ctrlKey && !e.altKey && !e.shiftKey: {
          e.preventDefault()
          if (!filePath) return
          seekBy(-5, duration)
          break
        }

        // Seek forward 1s (fine)
        case e.key === 'ArrowRight' && e.shiftKey && !e.ctrlKey: {
          e.preventDefault()
          if (!filePath) return
          seekBy(1, duration)
          break
        }

        // Seek backward 1s (fine)
        case e.key === 'ArrowLeft' && e.shiftKey && !e.ctrlKey: {
          e.preventDefault()
          if (!filePath) return
          seekBy(-1, duration)
          break
        }

        // Jump to start
        case e.key === 'Home': {
          e.preventDefault()
          seekTo(0)
          break
        }

        // Jump to end
        case e.key === 'End': {
          e.preventDefault()
          seekTo(duration)
          break
        }

        // Set trim in-point
        case e.key === 'i' && !e.ctrlKey && !e.altKey: {
          e.preventDefault()
          if (!filePath) return
          useTrimStore.getState().setTrimStart(Math.min(getCurrentTime(), trimEnd - 0.1))
          break
        }

        // Set trim out-point
        case e.key === 'o' && !e.ctrlKey && !e.altKey: {
          e.preventDefault()
          if (!filePath) return
          useTrimStore.getState().setTrimEnd(Math.max(getCurrentTime(), trimStart + 0.1))
          break
        }

        // Jump to trim start
        case e.key === 'I' && e.shiftKey: {
          e.preventDefault()
          seekTo(trimStart)
          break
        }

        // Jump to trim end
        case e.key === 'O' && e.shiftKey: {
          e.preventDefault()
          seekTo(trimEnd)
          break
        }

        // Reset trim
        case e.key === 'R' && e.ctrlKey && e.shiftKey: {
          e.preventDefault()
          useTrimStore.getState().resetTrim(duration)
          break
        }

        // Open file
        case e.key === 'o' && e.ctrlKey: {
          e.preventDefault()
          openVideoDialog()
          break
        }

        // Export
        case e.key === 'e' && e.ctrlKey: {
          e.preventDefault()
          if (filePath) useUIStore.getState().openExportDialog()
          break
        }

        // Toggle file panel
        case e.key === 'b' && e.ctrlKey: {
          e.preventDefault()
          useFileNavStore.getState().togglePanel()
          break
        }

        // Close file
        case e.key === 'w' && e.ctrlKey: {
          e.preventDefault()
          closeVideo()
          break
        }

        // Volume up
        case e.key === 'ArrowUp' && !e.ctrlKey && !e.shiftKey: {
          e.preventDefault()
          usePlaybackStore.getState().setVolume(clamp(volume + 0.05, 0, 1))
          break
        }

        // Volume down
        case e.key === 'ArrowDown' && !e.ctrlKey && !e.shiftKey: {
          e.preventDefault()
          usePlaybackStore.getState().setVolume(clamp(volume - 0.05, 0, 1))
          break
        }

        // Mute
        case e.key === 'm' && !e.ctrlKey: {
          e.preventDefault()
          usePlaybackStore.getState().toggleMute()
          break
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}
