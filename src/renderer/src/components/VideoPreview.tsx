import { useRef, useEffect } from 'react'
import { useVideoStore } from '../stores/videoStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useTrimStore } from '../stores/trimStore'
import {
  registerVideoElement,
  seekTo,
  flushPendingScrub,
  startPlaybackTicker,
  stopPlaybackTicker,
  onPlaybackTick
} from '../utils/videoElement'
import '../styles/video-preview.css'

export default function VideoPreview(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const filePath = useVideoStore((s) => s.filePath)
  const width = useVideoStore((s) => s.width)
  const height = useVideoStore((s) => s.height)
  const fps = useVideoStore((s) => s.fps)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const volume = usePlaybackStore((s) => s.volume)
  const isMuted = usePlaybackStore((s) => s.isMuted)
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime)
  const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying)

  const videoSrc = filePath
    ? `file:///${filePath.replace(/\\/g, '/')}`
    : ''

  // Share the element with the seek helpers used by other components
  useEffect(() => {
    registerVideoElement(videoRef.current)
    return () => registerVideoElement(null)
  }, [filePath])

  // Play / pause. Trim bounds are read at the moment playback starts rather
  // than tracked as deps, so moving a handle mid-playback doesn't restart it.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !filePath) return

    if (!isPlaying) {
      video.pause()
      setCurrentTime(video.currentTime)
      return
    }

    // Starting outside the trim region (or sitting on its end) restarts at
    // the in-point. Seeks land on frame boundaries, so "at the end" needs a
    // frame's worth of tolerance or play would advance one frame and stop.
    const { trimStart, trimEnd } = useTrimStore.getState()
    const endTolerance = Math.max(0.05, 1 / fps)
    if (video.currentTime < trimStart || video.currentTime >= trimEnd - endTolerance) {
      seekTo(trimStart)
    }

    startPlaybackTicker()
    const play = (): void => {
      video.play().catch(() => setIsPlaying(false))
    }
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play()
    } else {
      video.addEventListener('canplay', play, { once: true })
    }

    return () => {
      video.removeEventListener('canplay', play)
      stopPlaybackTicker()
    }
  }, [isPlaying, filePath, fps, setCurrentTime, setIsPlaying])

  // Stop at the out-point, checked every frame while playing
  useEffect(
    () =>
      onPlaybackTick((time) => {
        const { trimEnd } = useTrimStore.getState()
        if (time < trimEnd) return
        videoRef.current?.pause()
        seekTo(trimEnd)
        setIsPlaying(false)
      }),
    [setIsPlaying]
  )

  // Sync volume
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = isMuted
  }, [volume, isMuted])

  const handleClick = (): void => {
    usePlaybackStore.getState().togglePlay()
  }

  return (
    <div className="video-preview">
      {filePath ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            onSeeked={flushPendingScrub}
            onEnded={() => setIsPlaying(false)}
            onClick={handleClick}
            preload="auto"
          />
          {width > 0 && height > 0 && (
            <div className="video-badge">{width}x{height}</div>
          )}
        </>
      ) : null}
    </div>
  )
}
