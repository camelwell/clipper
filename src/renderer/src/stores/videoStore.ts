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
  /** Seconds of video each thumbnail represents */
  thumbnailInterval: number

  loadVideo: (filePath: string) => Promise<void>
  clearVideo: () => void
}

const THUMBNAIL_HEIGHT = 90
const MAX_THUMBNAILS = 120

export const useVideoStore = create<VideoState>((set, get) => ({
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

  // Resolves as soon as the file is probed so the player and trim range are
  // usable immediately; thumbnails fill the timeline in when they arrive.
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

    const count = Math.max(1, Math.min(Math.ceil(metadata.duration / 2), MAX_THUMBNAILS))
    window.clipperAPI
      .generateThumbnails(filePath, metadata.duration, count, THUMBNAIL_HEIGHT)
      .then((thumbnails) => {
        // Drop results for a file that's no longer the open one
        if (get().filePath === filePath) {
          set({ thumbnails, thumbnailInterval: metadata.duration / count })
        }
      })
      .catch(() => {
        // Thumbnails are non-critical
      })

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
  })
}))
