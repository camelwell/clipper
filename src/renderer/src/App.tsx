import { useState, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar'
import VideoPreview from './components/VideoPreview'
import PlaybackControls from './components/PlaybackControls'
import Timeline from './components/Timeline'
import FilePanel from './components/FilePanel'
import ExportDialog from './components/ExportDialog'
import DropZone from './components/DropZone'
import EmptyState from './components/EmptyState'
import ToastContainer from './components/Toast'
import { useVideoStore } from './stores/videoStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App(): JSX.Element {
  const filePath = useVideoStore((s) => s.filePath)
  useKeyboardShortcuts()

  // Video area height as a fraction of the available column space (0.3 – 0.8)
  const [videoFraction, setVideoFraction] = useState(0.72)
  const columnRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onDividerPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragging.current = true
  }, [])

  const onDividerPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !columnRef.current) return
    const rect = columnRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const frac = y / rect.height
    // Clamp so video is between 25% and 80% of the column
    setVideoFraction(Math.min(0.8, Math.max(0.25, frac)))
  }, [])

  const onDividerPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar />

      {filePath ? (
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Left column: video + divider + controls + timeline */}
          <div
            ref={columnRef}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
          >
            {/* Video — dynamic height */}
            <div style={{ height: `${videoFraction * 100}%`, minHeight: 80, flexShrink: 0 }}>
              <VideoPreview />
            </div>
            {/* Draggable divider */}
            <div
              className="resize-divider"
              onPointerDown={onDividerPointerDown}
              onPointerMove={onDividerPointerMove}
              onPointerUp={onDividerPointerUp}
            />
            {/* Playback controls — fixed */}
            <PlaybackControls />
            {/* Timeline — fixed */}
            <Timeline />
            {/* Gradient footer */}
            <div className="timeline-footer" />
          </div>
          {/* File panel on the right */}
          <FilePanel />
        </div>
      ) : (
        <EmptyState />
      )}

      <ExportDialog />
      <DropZone />
      <ToastContainer />
    </div>
  )
}
