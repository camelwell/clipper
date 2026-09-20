import { openVideoDialog } from '../utils/openVideo'
import logoLong from '../assets/clipper_long.png'
import '../styles/empty-state.css'

export default function EmptyState(): JSX.Element {
  return (
    <div className="empty-state" onClick={openVideoDialog}>
      <img src={logoLong} alt="clipper" className="empty-state-logo-img" draggable={false} />
      <div className="empty-state-cta">
        Drop an MP4 file here or click to browse &middot; <kbd>Ctrl+O</kbd>
      </div>
    </div>
  )
}
