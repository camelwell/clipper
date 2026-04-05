import { useEffect, useRef, useCallback } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useVideoStore } from '../stores/videoStore'
import { useTrimStore } from '../stores/trimStore'
import { usePlaybackStore } from '../stores/playbackStore'
import '../styles/drop-zone.css'

export default function DropZone(): JSX.Element | null {
  const isActive = useUIStore((s) => s.isDropZoneActive)
  const setActive = useUIStore((s) => s.setDropZoneActive)
  const addToast = useUIStore((s) => s.addToast)
  const dragCounter = useRef(0)

  const handleFile = useCallback(async (filePath: string) => {
    if (!filePath.toLowerCase().endsWith('.mp4')) {
      addToast('Only MP4 files are supported', 'error')
      return
    }
    try {
      await useVideoStore.getState().loadVideo(filePath)
      useTrimStore.getState().resetTrim(useVideoStore.getState().duration)
      usePlaybackStore.getState().setCurrentTime(0)
      usePlaybackStore.getState().setIsPlaying(false)
    } catch {
      addToast('Failed to load video', 'error')
    }
  }, [addToast])

  useEffect(() => {
    const handleDragEnter = (e: DragEvent): void => {
      e.preventDefault()
      dragCounter.current++
      if (dragCounter.current === 1) setActive(true)
    }

    const handleDragLeave = (e: DragEvent): void => {
      e.preventDefault()
      dragCounter.current--
      if (dragCounter.current === 0) setActive(false)
    }

    const handleDragOver = (e: DragEvent): void => {
      e.preventDefault()
    }

    const handleDrop = (e: DragEvent): void => {
      e.preventDefault()
      dragCounter.current = 0
      setActive(false)

      const file = e.dataTransfer?.files[0]
      if (file) {
        // Electron provides file.path
        handleFile((file as File & { path: string }).path)
      }
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [setActive, handleFile])

  if (!isActive) return null

  return (
    <div className="drop-zone">
      <div className="drop-zone-inner">
        <div className="drop-zone-text">Drop MP4 File</div>
        <div className="drop-zone-hint">Release to open</div>
      </div>
    </div>
  )
}
