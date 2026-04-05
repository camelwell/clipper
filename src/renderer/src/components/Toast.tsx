import { useUIStore } from '../stores/uiStore'
import '../styles/toast.css'

export default function ToastContainer(): JSX.Element {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '\u2713' : toast.type === 'error' ? '\u2717' : '\u2139'}
          </span>
          <span>{toast.message}</span>
          <button className="toast-dismiss" onClick={() => removeToast(toast.id)}>{'\u2715'}</button>
        </div>
      ))}
    </div>
  )
}
