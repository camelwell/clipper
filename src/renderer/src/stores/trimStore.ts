import { create } from 'zustand'

interface TrimState {
  trimStart: number
  trimEnd: number
  isDragging: boolean
  activeHandle: 'start' | 'end' | null

  setTrimStart: (time: number) => void
  setTrimEnd: (time: number) => void
  setDragging: (isDragging: boolean, handle: 'start' | 'end' | null) => void
  resetTrim: (duration: number) => void
}

export const useTrimStore = create<TrimState>((set) => ({
  trimStart: 0,
  trimEnd: 0,
  isDragging: false,
  activeHandle: null,

  setTrimStart: (time) => set({ trimStart: time }),
  setTrimEnd: (time) => set({ trimEnd: time }),
  setDragging: (isDragging, handle) => set({ isDragging, activeHandle: handle }),
  resetTrim: (duration) => set({ trimStart: 0, trimEnd: duration, isDragging: false, activeHandle: null })
}))
