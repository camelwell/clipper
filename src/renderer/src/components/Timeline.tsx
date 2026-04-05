import { useRef, useEffect, useCallback, useState } from 'react'
import { useVideoStore } from '../stores/videoStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useTrimStore } from '../stores/trimStore'
import { formatTime } from '../utils/formatTime'
import { clamp } from '../utils/clamp'
import '../styles/timeline.css'

function getVideo(): HTMLVideoElement | null {
  return (window as unknown as { __clipperVideo: HTMLVideoElement | null }).__clipperVideo ?? null
}

export default function Timeline(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])

  const duration = useVideoStore((s) => s.duration)
  const thumbnails = useVideoStore((s) => s.thumbnails)
  const filePath = useVideoStore((s) => s.filePath)
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const trimStart = useTrimStore((s) => s.trimStart)
  const trimEnd = useTrimStore((s) => s.trimEnd)
  const setTrimStart = useTrimStore((s) => s.setTrimStart)
  const setTrimEnd = useTrimStore((s) => s.setTrimEnd)
  const isDragging = useTrimStore((s) => s.isDragging)
  const setDragging = useTrimStore((s) => s.setDragging)
  const activeHandle = useTrimStore((s) => s.activeHandle)

  // Zoom & pan state (Premiere Pro style)
  const [zoom, setZoom] = useState(1) // 1 = full video visible
  const [scrollPos, setScrollPos] = useState(0) // 0..1 fraction of timeline at left edge

  const [dragTooltip, setDragTooltip] = useState<{ x: number; time: number } | null>(null)

  // Visible time range
  const visibleDuration = duration / zoom
  const visibleStart = scrollPos * duration
  const visibleEnd = visibleStart + visibleDuration

  // Convert time to pixel X position within the container
  const timeToPx = useCallback((time: number): number => {
    if (!containerRef.current || duration === 0) return 0
    const w = containerRef.current.getBoundingClientRect().width
    return ((time - visibleStart) / visibleDuration) * w
  }, [visibleStart, visibleDuration, duration])

  // Convert pixel X to time
  const pxToTime = useCallback((px: number): number => {
    if (!containerRef.current || duration === 0) return 0
    const w = containerRef.current.getBoundingClientRect().width
    return visibleStart + (px / w) * visibleDuration
  }, [visibleStart, visibleDuration, duration])

  // Reset zoom when loading new video
  useEffect(() => {
    setZoom(1)
    setScrollPos(0)
  }, [filePath])

  // Load thumbnail images
  useEffect(() => {
    imagesRef.current = thumbnails.map((src) => {
      const img = new Image()
      img.src = src
      return img
    })
  }, [thumbnails])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !filePath || duration === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio
    const w = rect.width
    const h = rect.height

    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    // Clear
    ctx.fillStyle = '#181818'
    ctx.fillRect(0, 0, w, h)

    // Draw thumbnails (only visible portion)
    const images = imagesRef.current
    if (images.length > 0) {
      const totalThumbWidth = w * zoom
      const singleThumbWidth = totalThumbWidth / images.length
      const offsetPx = scrollPos * totalThumbWidth

      images.forEach((img, i) => {
        if (!img.complete || img.naturalWidth === 0) return
        const x = i * singleThumbWidth - offsetPx
        // Skip off-screen thumbnails
        if (x + singleThumbWidth < 0 || x > w) return
        ctx.drawImage(img, x, 0, singleThumbWidth + 1, h)
      })
    }

    // Draw excluded regions (outside trim)
    const trimStartPx = timeToPx(trimStart)
    const trimEndPx = timeToPx(trimEnd)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    if (trimStartPx > 0) ctx.fillRect(0, 0, trimStartPx, h)
    if (trimEndPx < w) ctx.fillRect(trimEndPx, 0, w - trimEndPx, h)

    // Trim region border
    ctx.strokeStyle = '#D4863A'
    ctx.lineWidth = 2
    const sx = clamp(trimStartPx, 0, w)
    const ex = clamp(trimEndPx, 0, w)
    if (ex > sx) ctx.strokeRect(sx, 0, ex - sx, h)
  }, [thumbnails, duration, trimStart, trimEnd, filePath, zoom, scrollPos, timeToPx])

  // Scroll wheel: zoom in/out centered on cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (duration === 0) return

    const rect = containerRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseFrac = mouseX / rect.width // 0..1 position of cursor
    const timeAtCursor = pxToTime(mouseX)

    // Zoom factor
    const zoomDelta = e.deltaY < 0 ? 1.25 : 0.8
    const newZoom = clamp(zoom * zoomDelta, 1, 200)

    // Adjust scroll so time under cursor stays at the same pixel
    const newVisibleDuration = duration / newZoom
    const newVisibleStart = timeAtCursor - mouseFrac * newVisibleDuration
    const maxScroll = Math.max(0, 1 - 1 / newZoom)
    const newScrollPos = clamp(newVisibleStart / duration, 0, maxScroll)

    setZoom(newZoom)
    setScrollPos(newScrollPos)
  }, [duration, zoom, pxToTime])

  // Click to seek
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging || duration === 0) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = clamp(pxToTime(x), 0, duration)
    const video = getVideo()
    if (video) {
      video.currentTime = time
      usePlaybackStore.getState().setCurrentTime(time)
    }
  }, [duration, isDragging, pxToTime])

  // Trim handle drag
  const handlePointerDown = useCallback((handle: 'start' | 'end', e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(true, handle)
  }, [setDragging])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !activeHandle || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = clamp(pxToTime(x), 0, duration)

    if (activeHandle === 'start') {
      setTrimStart(Math.min(time, trimEnd - 0.1))
    } else {
      setTrimEnd(Math.max(time, trimStart + 0.1))
    }
    setDragTooltip({ x: e.clientX - rect.left, time })
  }, [isDragging, activeHandle, duration, trimStart, trimEnd, setTrimStart, setTrimEnd, pxToTime])

  const handlePointerUp = useCallback(() => {
    setDragging(false, null)
    setDragTooltip(null)
  }, [setDragging])

  if (!filePath) {
    return <div className="timeline" />
  }

  // Pixel positions for DOM overlays
  const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 9999
  const playheadLeft = timeToPx(currentTime)
  const trimStartLeft = timeToPx(trimStart)
  const trimEndLeft = timeToPx(trimEnd)

  // Clamp handles to always be visible inside the container
  // Start handle: sits inside trim region, right edge at trim start line
  const HANDLE_W = 14
  const startHandleLeft = Math.max(0, trimStartLeft)
  // End handle: sits inside trim region, left edge at trim end line
  const endHandleLeft = Math.min(containerWidth - HANDLE_W, trimEndLeft - HANDLE_W)

  // Generate timecodes (adaptive to zoom level)
  const baseInterval = duration <= 30 ? 5 : duration <= 120 ? 10 : duration <= 600 ? 30 : 60
  const scaledInterval = Math.max(0.1, baseInterval / zoom)
  // Round to nice numbers
  const niceIntervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
  const interval = niceIntervals.find((n) => n >= scaledInterval) ?? scaledInterval

  const timecodes: { time: number; px: number }[] = []
  const start = Math.ceil(visibleStart / interval) * interval
  for (let t = start; t < visibleEnd; t += interval) {
    if (t <= 0 || t >= duration) continue
    const px = timeToPx(t)
    timecodes.push({ time: t, px })
  }

  return (
    <div
      className="timeline"
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="timeline-canvas" onClick={handleCanvasClick} />

      {/* Playhead */}
      {playheadLeft >= 0 && playheadLeft <= containerWidth && (
        <div className="timeline-playhead" style={{ left: playheadLeft }} />
      )}

      {/* Trim start handle — always visible, sits inside trim region */}
      <div
        className={`trim-handle start ${isDragging && activeHandle === 'start' ? 'dragging' : ''}`}
        style={{ left: startHandleLeft }}
        onPointerDown={(e) => handlePointerDown('start', e)}
      >
        <div className="trim-handle-grip" />
        <div className="trim-handle-grip" />
        <div className="trim-handle-grip" />
      </div>

      {/* Trim end handle — always visible, sits inside trim region */}
      <div
        className={`trim-handle end ${isDragging && activeHandle === 'end' ? 'dragging' : ''}`}
        style={{ left: endHandleLeft }}
        onPointerDown={(e) => handlePointerDown('end', e)}
      >
        <div className="trim-handle-grip" />
        <div className="trim-handle-grip" />
        <div className="trim-handle-grip" />
      </div>

      {/* Drag tooltip */}
      {dragTooltip && (
        <div className="trim-tooltip" style={{ left: dragTooltip.x }}>
          {formatTime(dragTooltip.time)}
        </div>
      )}

      {/* Zoom indicator */}
      {zoom > 1 && (
        <div className="timeline-zoom-badge">{zoom.toFixed(1)}x</div>
      )}

      {/* Timecodes */}
      <div className="timeline-timecodes">
        {timecodes.map((tc) => (
          <span key={tc.time} className="timeline-timecode" style={{ left: tc.px }}>
            {formatTime(tc.time)}
          </span>
        ))}
      </div>
    </div>
  )
}
