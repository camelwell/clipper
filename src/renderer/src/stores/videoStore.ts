import { create } from 'zustand'

interface VideoState {
  filePath: string | null
  fileName: string | null
  fileSize: number | null
  duration: number
  width: number
  height: number
  codec: string
  fps: number
  bitrate: number
  thumbnails: string[]
  thumbnailInterval: number

  loadVideo: (filePath: string) => Promise<void>
  clearVideo: () => void
  setThumbnails: (thumbnails: string[], interval: number) => void
}

export const useVideoStore = create<VideoState>((set) => ({
  filePath: null,
  fileName: null,
  fileSize: null,
  duration: 0,
  width: 0,
  height: 0,
  codec: '',
  fps: 30,
  bitrate: 0,
  thumbnails: [],
  thumbnailInterval: 0,

  loadVideo: async (filePath: string) => {
    const metadata = await window.clipperAPI.probeVideo(filePath)
    const fileName = filePath.split(/[\\/]/).pop() ?? filePath

    set({
      filePath,
      fileName,
      fileSize: metadata.fileSize,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      codec: metadata.codec,
      fps: metadata.fps,
      bitrate: metadata.bitrate,
      thumbnails: [],
      thumbnailInterval: 0
    })

    // Generate thumbnails in background
    const count = Math.min(Math.ceil(metadata.duration / 2), 120)
    try {
      const thumbnails = await window.clipperAPI.generateThumbnails(filePath, count, 90)
      const interval = metadata.duration / count
      set({ thumbnails, thumbnailInterval: interval })
    } catch {
      // Thumbnails are non-critical
    }

    // Add to recent files
    const dirPath = filePath.substring(0, filePath.lastIndexOf(filePath.includes('/') ? '/' : '\\'))
    window.clipperAPI.setLastDirectory(dirPath)

    try {
      await window.clipperAPI.addRecentFile({
        filePath,
        fileName,
        thumbnail: null,
        fileSize: metadata.fileSize,
        lastOpened: Date.now()
      })
    } catch {
      // Non-critical
    }
  },

  clearVideo: () => set({
    filePath: null,
    fileName: null,
    fileSize: null,
    duration: 0,
    width: 0,
    height: 0,
    codec: '',
    fps: 30,
    bitrate: 0,
    thumbnails: [],
    thumbnailInterval: 0
  }),

  setThumbnails: (thumbnails, interval) => set({ thumbnails, thumbnailInterval: interval })
}))
