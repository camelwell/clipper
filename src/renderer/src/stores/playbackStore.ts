import { create } from 'zustand'

interface PlaybackState {
  currentTime: number
  isPlaying: boolean
  volume: number
  isMuted: boolean

  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentTime: 0,
  isPlaying: false,
  volume: 1,
  isMuted: false,

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted }))
}))
