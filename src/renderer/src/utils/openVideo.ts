import { useVideoStore } from '../stores/videoStore'
import { useTrimStore } from '../stores/trimStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useFileNavStore } from '../stores/fileNavStore'
import { useUIStore } from '../stores/uiStore'

/**
 * Load a video and reset trim/playback state. Every way of opening a file
 * (dialog, drop, file panel, shortcut) goes through here.
 */
export async function openVideo(filePath: string): Promise<void> {
  if (!filePath.toLowerCase().endsWith('.mp4')) {
    useUIStore.getState().addToast('Only MP4 files are supported', 'error')
    return
  }

  usePlaybackStore.getState().setIsPlaying(false)
  try {
    await useVideoStore.getState().loadVideo(filePath)
  } catch {
    useUIStore.getState().addToast('Failed to load video', 'error')
    return
  }

  useTrimStore.getState().resetTrim(useVideoStore.getState().duration)
  usePlaybackStore.getState().setCurrentTime(0)
  useFileNavStore.getState().loadRecentFiles()
}

export async function openVideoDialog(): Promise<void> {
  const filePath = await window.clipperAPI.openFileDialog()
  if (filePath) await openVideo(filePath)
}

export function closeVideo(): void {
  usePlaybackStore.getState().setIsPlaying(false)
  usePlaybackStore.getState().setCurrentTime(0)
  useVideoStore.getState().clearVideo()
  useTrimStore.getState().resetTrim(0)
}
