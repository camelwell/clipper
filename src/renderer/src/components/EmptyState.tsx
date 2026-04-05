import { useVideoStore } from '../stores/videoStore'
import { useTrimStore } from '../stores/trimStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useUIStore } from '../stores/uiStore'
import logoLong from '../assets/clipper_long.png'
import '../styles/empty-state.css'

export default function EmptyState(): JSX.Element {
  const addToast = useUIStore((s) => s.addToast)

  const openDialog = async (): Promise<void> => {
    const filePath = await window.clipperAPI.openFileDialog()
    if (filePath) {
      try {
        await useVideoStore.getState().loadVideo(filePath)
        useTrimStore.getState().resetTrim(useVideoStore.getState().duration)
        usePlaybackStore.getState().setCurrentTime(0)
        usePlaybackStore.getState().setIsPlaying(false)
      } catch {
        addToast('Failed to load video', 'error')
      }
    }
  }

  return (
    <div className="empty-state" onClick={openDialog}>
      <img src={logoLong} alt="clipper" className="empty-state-logo-img" draggable={false} />
      <div className="empty-state-cta">
        Drop an MP4 file here or click to browse &middot; <kbd>Ctrl+O</kbd>
      </div>
    </div>
  )
}
