import { useRef, useEffect, useCallback, useState } from 'react'
import { useVideoStore } from '../stores/videoStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useTrimStore } from '../stores/trimStore'
import { useSmoothTime } from '../hooks/useSmoothTime'
import { seekTo, scrubTo } from '../utils/videoElement'
import { formatTime } from '../utils/formatTime'
import { clamp } from '../utils/clamp'
import '../styles/timeline.css'

const HANDLE_W = 12
const MIN_TRIM_GAP = 0.1
const NICE_INTERVALS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

type DragMode = 'start' | 'end' | 'scrub'

export default function Timeline(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const drawRef = useRef<() => void>(() => {})
  // Pointer offset from the trim line when a handle is grabbed, so the
  // region doesn't jump by the grab position on the first move
  const grabOffsetRef = useRef(0)

  const duration = useVideoStore((s) => s.duration)
  const thumbnails = useVideoStore((s) => s.thumbnails)
  const thumbnailInterval = useVideoStore((s) => s.thumbnailInterval)
  const filePath = useVideoStore((s) => s.filePath)
  const trimStart = useTrimStore((s) => s.trimStart)
  const trimEnd = useTrimStore((s) => s.trimEnd)
  const setTrimStart = useTrimStore((s) => s.setTrimStart)
  const setTrimEnd = useTrimStore((s) => s.setTrimEnd)

  // Canvas size in CSS px, kept current by a ResizeObserver
  const [size, setSize] = useState({ width: 0, height: 0 })
  const { width, height } = size

  // Zoom & pan state (Premiere Pro style)
  const [zoom, setZoom] = useState(1) // 1 = full video visible
  const [scrollPos, setScrollPos] = useState(0) // 0..1 fraction of timeline at left edge

  const [drag, setDrag] = useState<DragMode | null>(null)
  const [dragTooltip, setDragTooltip] = useState<{ x: number; time: number } | null>(null)

  // Visible time range
  const visibleDuration = duration / zoom
  const visibleStart = scrollPos * duration
  const visibleEnd = visibleStart + visibleDuration

  const timeToPx = useCallback((time: number): number => {
    if (duration === 0) return 0
    return ((time - visibleStart) / visibleDuration) * width
  }, [visibleStart, visibleDuration, duration, width])

  const pxToTime = useCallback((px: number): number => {
    if (duration === 0 || width === 0) return 0
    return visibleStart + (px / width) * visibleDuration
  }, [visibleStart, visibleDuration, duration, width])

  // Reset zoom when loading new video
  useEffect(() => {
    setZoom(1)
    setScrollPos(0)
  }, [filePath])

  // Track canvas size so the backing store and overlays follow window/panel resizes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      setSize({ width: w, height: h })
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [filePath])

  // Load thumbnail images; redraw as each one decodes
  useEffect(() => {
    imagesRef.current = thumbnails.map((src) => {
      const img = new Image()
      img.onload = () => drawRef.current()
      img.src = src
      return img
    })
    return () => {
      imagesRef.current.forEach((img) => { img.onload = null })
      imagesRef.current = []
    }
  }, [thumbnails])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0 || duration === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Only reallocate the backing store when the size actually changed
    const dpr = window.devicePixelRatio
    const bw = Math.round(width * dpr)
    const bh = Math.round(height * dpr)
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = '#181818'
    ctx.fillRect(0, 0, width, height)

    // Thumbnails, each covering the span of video it represents (only the
    // visible ones). The last one extends to the end of the video.
    const images = imagesRef.current
    if (images.length > 0 && thumbnailInterval > 0) {
      images.forEach((img, i) => {
        if (!img.complete || img.naturalWidth === 0) return
        const x0 = timeToPx(i * thumbnailInterval)
        const x1 = i === images.length - 1 ? timeToPx(duration) : timeToPx((i + 1) * thumbnailInterval)
        if (x1 < 0 || x0 > width) return
        ctx.drawImage(img, x0, 0, x1 - x0 + 1, height)
      })
    }

    // Excluded regions (outside trim)
    const trimStartPx = timeToPx(trimStart)
    const trimEndPx = timeToPx(trimEnd)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    if (trimStartPx > 0) ctx.fillRect(0, 0, trimStartPx, height)
    if (trimEndPx < width) ctx.fillRect(trimEndPx, 0, width - trimEndPx, height)

    // Trim region border
    ctx.strokeStyle = '#D4863A'
    ctx.lineWidth = 2
    const sx = clamp(trimStartPx, 0, width)
    const ex = clamp(trimEndPx, 0, width)
    if (ex > sx) ctx.strokeRect(sx, 0, ex - sx, height)
  }, [width, height, duration, trimStart, trimEnd, thumbnails, thumbnailInterval, timeToPx])

  useEffect(() => {
    drawRef.current = draw
    draw()
  }, [draw])

  // Playhead: positioned directly on the DOM node, outside React's render cycle
  const positionPlayhead = useCallback((time: number) => {
    const el = playheadRef.current
    if (!el) return
    const x = timeToPx(time)
    if (x < 0 || x > width) {
      el.style.display = 'none'
      return
    }
    el.style.display = ''
    el.style.transform = `translateX(${x}px)`
  }, [timeToPx, width])
  useSmoothTime(positionPlayhead)

  // Scroll wheel: zoom in/out centered on cursor. Attached natively because
  // React registers wheel listeners as passive, which makes preventDefault a no-op.
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (duration === 0 || width === 0) return

    const rect = containerRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseFrac = mouseX / width
    const timeAtCursor = pxToTime(mouseX)

    const zoomDelta = e.deltaY < 0 ? 1.25 : 0.8
    const newZoom = clamp(zoom * zoomDelta, 1, 200)

    // Keep the time under the cursor at the same pixel
    const newVisibleDuration = duration / newZoom
    const newVisibleStart = timeAtCursor - mouseFrac * newVisibleDuration
    const maxScroll = Math.max(0, 1 - 1 / newZoom)

    setZoom(newZoom)
    setScrollPos(clamp(newVisibleStart / duration, 0, maxScroll))
  }, [duration, width, zoom, pxToTime])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel, filePath])

  // Handle positions: each sits inside the trim region, flush with its line,
  // and stays visible at the edge when its line is scrolled out of view
  const startHandleLeft = Math.max(0, timeToPx(trimStart))
  const endHandleLeft = Math.min(width - HANDLE_W, timeToPx(trimEnd) - HANDLE_W)

  // --- Dragging: trim handles scrub the preview to the handle; the strip
  // itself scrubs the playhead. All of it is a paused-only interaction.

  const pointerX = (e: React.PointerEvent): number =>
    e.clientX - containerRef.current!.getBoundingClientRect().left

  const applyDrag = useCallback((mode: DragMode, x: number) => {
    const time = clamp(pxToTime(x), 0, duration)
    if (mode === 'start') {
      const t = clamp(time, 0, trimEnd - MIN_TRIM_GAP)
      setTrimStart(t)
      scrubTo(t)
      setDragTooltip({ x: timeToPx(t), time: t })
    } else if (mode === 'end') {
      const t = clamp(time, trimStart + MIN_TRIM_GAP, duration)
      setTrimEnd(t)
      scrubTo(t)
      setDragTooltip({ x: timeToPx(t), time: t })
    } else {
      scrubTo(time)
    }
  }, [pxToTime, timeToPx, duration, trimStart, trimEnd, setTrimStart, setTrimEnd])

  const beginDrag = (mode: DragMode, e: React.PointerEvent): void => {
    if (e.button !== 0 || duration === 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    usePlaybackStore.getState().setIsPlaying(false)
    setDrag(mode)

    const x = pointerX(e)
    if (mode === 'scrub') {
      grabOffsetRef.current = 0
      applyDrag(mode, x)
    } else {
      // Grabbing a handle shows its frame right away, without moving it
      const lineX = mode === 'start' ? startHandleLeft : endHandleLeft + HANDLE_W
      grabOffsetRef.current = x - lineX
      const t = mode === 'start' ? trimStart : trimEnd
      scrubTo(t)
      setDragTooltip({ x: lineX, time: t })
    }
  }

  const handlePointerMove = (e: React.PointerEvent): void => {
    if (!drag) return
    applyDrag(drag, pointerX(e) - grabOffsetRef.current)
  }

  const endDrag = (): void => {
    if (!drag) return
    // Force a final seek so the frame shown matches where the drag ended,
    // even if the last scrub was parked behind an in-flight seek
    if (drag === 'start') seekTo(trimStart)
    else if (drag === 'end') seekTo(trimEnd)
    else seekTo(usePlaybackStore.getState().currentTime)
    setDrag(null)
    setDragTooltip(null)
  }

  if (!filePath) {
    return <div className="timeline" />
  }

  // Timecodes (adaptive to zoom level)
  const baseInterval = duration <= 30 ? 5 : duration <= 120 ? 10 : duration <= 600 ? 30 : 60
  const scaledInterval = Math.max(0.1, baseInterval / zoom)
  const interval = NICE_INTERVALS.find((n) => n >= scaledInterval) ?? scaledInterval

  const timecodes: { time: number; px: number }[] = []
  const firstTick = Math.ceil(visibleStart / interval) * interval
  for (let t = firstTick; t < visibleEnd; t += interval) {
    if (t <= 0 || t >= duration) continue
    timecodes.push({ time: t, px: timeToPx(t) })
  }

  return (
    <div
      className={`timeline ${drag ? 'dragging' : ''}`}
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <canvas
        ref={canvasRef}
        className="timeline-canvas"
        onPointerDown={(e) => beginDrag('scrub', e)}
      />

      <div ref={playheadRef} className="timeline-playhead" />

      <div
        className={`trim-handle start ${drag === 'start' ? 'dragging' : ''}`}
        style={{ left: startHandleLeft }}
        onPointerDown={(e) => beginDrag('start', e)}
      >
        <div className="trim-handle-grip" />
        <div className="trim-handle-grip" />
        <div className="trim-handle-grip" />
      </div>

      <div
        className={`trim-handle end ${drag === 'end' ? 'dragging' : ''}`}
        style={{ left: endHandleLeft }}
        onPointerDown={(e) => beginDrag('end', e)}
      >
        <div className="trim-handle-grip" />
        <div className="trim-handle-grip" />
        <div className="trim-handle-grip" />
      </div>

      {dragTooltip && (
        <div className="trim-tooltip" style={{ left: clamp(dragTooltip.x, 36, width - 36) }}>
          {formatTime(dragTooltip.time)}
        </div>
      )}

      {zoom > 1 && (
        <div className="timeline-zoom-badge">{zoom.toFixed(1)}x</div>
      )}

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
