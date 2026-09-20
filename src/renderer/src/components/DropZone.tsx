import { useEffect, useRef } from 'react'
import { useUIStore } from '../stores/uiStore'
import { openVideo } from '../utils/openVideo'
import '../styles/drop-zone.css'

export default function DropZone(): JSX.Element | null {
  const isActive = useUIStore((s) => s.isDropZoneActive)
  const setActive = useUIStore((s) => s.setDropZoneActive)
  const addToast = useUIStore((s) => s.addToast)
  const dragCounter = useRef(0)

  useEffect(() => {
    const hasFiles = (e: DragEvent): boolean => e.dataTransfer?.types.includes('Files') ?? false

    const handleDragEnter = (e: DragEvent): void => {
      e.preventDefault()
      if (!hasFiles(e)) return
      dragCounter.current++
      if (dragCounter.current === 1) setActive(true)
    }

    const handleDragLeave = (e: DragEvent): void => {
      e.preventDefault()
      if (!hasFiles(e)) return
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
      if (!file) return
      // File.path is gone in Electron 32+; resolve the path through the preload
      const filePath = window.clipperAPI.getPathForFile(file)
      if (!filePath) {
        addToast('Could not read the dropped file', 'error')
        return
      }
      openVideo(filePath)
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
  }, [setActive, addToast])

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
