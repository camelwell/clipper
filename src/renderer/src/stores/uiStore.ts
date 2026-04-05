import { create } from 'zustand'

interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration: number
}

interface UIState {
  isExportDialogOpen: boolean
  isDropZoneActive: boolean
  toasts: ToastMessage[]

  openExportDialog: () => void
  closeExportDialog: () => void
  setDropZoneActive: (active: boolean) => void
  addToast: (message: string, type: ToastMessage['type'], duration?: number) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  isExportDialogOpen: false,
  isDropZoneActive: false,
  toasts: [],

  openExportDialog: () => set({ isExportDialogOpen: true }),
  closeExportDialog: () => set({ isExportDialogOpen: false }),
  setDropZoneActive: (active) => set({ isDropZoneActive: active }),

  addToast: (message, type, duration = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))
