import { create } from 'zustand'

interface TrimState {
  trimStart: number
  trimEnd: number

  setTrimStart: (time: number) => void
  setTrimEnd: (time: number) => void
  resetTrim: (duration: number) => void
}

export const useTrimStore = create<TrimState>((set) => ({
  trimStart: 0,
  trimEnd: 0,

  setTrimStart: (time) => set({ trimStart: time }),
  setTrimEnd: (time) => set({ trimEnd: time }),
  resetTrim: (duration) => set({ trimStart: 0, trimEnd: duration })
}))
