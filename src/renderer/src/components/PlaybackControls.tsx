import { useVideoStore } from '../stores/videoStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useTrimStore } from '../stores/trimStore'
import { useUIStore } from '../stores/uiStore'
import { formatTime } from '../utils/formatTime'
import BackIcon from '../assets/back.svg'
import ForwardIcon from '../assets/forward.svg'
import PlayPauseIcon from '../assets/playpause.svg'
import VolHighIcon from '../assets/volhigh.svg'
import VolLowIcon from '../assets/vollow.svg'
import VolMuteIcon from '../assets/volmute.svg'
import VolNoneIcon from '../assets/volnone.svg'
import '../styles/playback.css'

function VolumeIcon({ volume, isMuted }: { volume: number; isMuted: boolean }): JSX.Element {
  if (isMuted) return <img src={VolMuteIcon} alt="" className="icon" />
  if (volume === 0) return <img src={VolNoneIcon} alt="" className="icon" />
  if (volume < 0.5) return <img src={VolLowIcon} alt="" className="icon" />
  return <img src={VolHighIcon} alt="" className="icon" />
}

export default function PlaybackControls(): JSX.Element {
  const duration = useVideoStore((s) => s.duration)
  const fps = useVideoStore((s) => s.fps)
  const filePath = useVideoStore((s) => s.filePath)
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const togglePlay = usePlaybackStore((s) => s.togglePlay)
  const volume = usePlaybackStore((s) => s.volume)
  const setVolume = usePlaybackStore((s) => s.setVolume)
  const isMuted = usePlaybackStore((s) => s.isMuted)
  const toggleMute = usePlaybackStore((s) => s.toggleMute)
  const trimStart = useTrimStore((s) => s.trimStart)
  const trimEnd = useTrimStore((s) => s.trimEnd)
  const openExportDialog = useUIStore((s) => s.openExportDialog)

  const trimmedDuration = trimEnd - trimStart

  const seekVideo = (time: number): void => {
    const video = (window as unknown as { __clipperVideo: HTMLVideoElement | null }).__clipperVideo
    if (video) {
      video.currentTime = time
      usePlaybackStore.getState().setCurrentTime(time)
    }
  }

  const stepFrame = (dir: 1 | -1): void => {
    const frameDuration = 1 / fps
    const newTime = Math.max(0, Math.min(duration, currentTime + dir * frameDuration))
    seekVideo(newTime)
  }

  if (!filePath) return <div className="playback-controls" />

  return (
    <div className="playback-controls">
      <button className="playback-btn" onClick={() => stepFrame(-1)} title="Previous frame (,)">
        <img src={BackIcon} alt="" className="icon" />
      </button>
      <button className={`playback-btn ${isPlaying ? 'active' : ''}`} onClick={togglePlay} title="Play/Pause (Space)">
        <img src={PlayPauseIcon} alt="" className="icon" />
      </button>
      <button className="playback-btn" onClick={() => stepFrame(1)} title="Next frame (.)">
        <img src={ForwardIcon} alt="" className="icon" />
      </button>

      <span className="playback-time">{formatTime(currentTime)}</span>
      <span className="playback-separator">/</span>
      <span className="playback-time" style={{ opacity: 0.5 }}>{formatTime(duration)}</span>

      <div className="playback-spacer" />

      <span className="playback-trim-info">
        TRIM {formatTime(trimmedDuration)}
      </span>

      <div className="volume-group">
        <button className="playback-btn" onClick={toggleMute} title="Mute (M)">
          <VolumeIcon volume={volume} isMuted={isMuted} />
        </button>
        <input
          type="range"
          className="volume-slider"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      <button className="export-btn" onClick={openExportDialog} title="Export (Ctrl+E)">
        EXPORT
      </button>
    </div>
  )
}
