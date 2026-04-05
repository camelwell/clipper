import { useRef, useEffect, useCallback } from 'react'
import { useVideoStore } from '../stores/videoStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useTrimStore } from '../stores/trimStore'
import '../styles/video-preview.css'

export default function VideoPreview(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const filePath = useVideoStore((s) => s.filePath)
  const width = useVideoStore((s) => s.width)
  const height = useVideoStore((s) => s.height)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const volume = usePlaybackStore((s) => s.volume)
  const isMuted = usePlaybackStore((s) => s.isMuted)
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime)
  const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying)
  const trimStart = useTrimStore((s) => s.trimStart)
  const trimEnd = useTrimStore((s) => s.trimEnd)

  const videoSrc = filePath
    ? `file:///${filePath.replace(/\\/g, '/')}`
    : ''

  // Expose video ref globally for seeking from other components
  useEffect(() => {
    const w = window as unknown as { __clipperVideo: HTMLVideoElement | null }
    w.__clipperVideo = videoRef.current
    return () => { w.__clipperVideo = null }
  })

  // Sync play/pause to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video || !filePath) return

    if (isPlaying) {
      // If playhead is outside the trim region, jump to trim start
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart
        setCurrentTime(trimStart)
      }

      if (video.readyState >= 2) {
        video.play().catch(() => setIsPlaying(false))
      } else {
        const onCanPlay = (): void => {
          video.play().catch(() => setIsPlaying(false))
          video.removeEventListener('canplay', onCanPlay)
        }
        video.addEventListener('canplay', onCanPlay)
        return () => video.removeEventListener('canplay', onCanPlay)
      }
    } else {
      video.pause()
    }
  }, [isPlaying, filePath, setIsPlaying, trimStart, trimEnd, setCurrentTime])

  // Sync volume
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = isMuted
  }, [volume, isMuted])

  // Time update — enforce trim boundary
  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const time = video.currentTime
    setCurrentTime(time)
    if (trimEnd > 0 && time >= trimEnd) {
      video.pause()
      video.currentTime = trimEnd
      setIsPlaying(false)
    }
  }, [setCurrentTime, trimEnd, setIsPlaying])

  // Click video to toggle play/pause
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
            onTimeUpdate={onTimeUpdate}
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
