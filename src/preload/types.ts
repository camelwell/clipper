export interface VideoMetadata {
  duration: number
  width: number
  height: number
  codec: string
  fps: number
  bitrate: number
  fileSize: number
}

export interface ExportOptions {
  inputPath: string
  outputPath: string
  trimStart: number
  trimEnd: number
  useStreamCopy: boolean
}

export interface ExportProgress {
  percent: number
  timemark: string
}

export interface RecentFileEntry {
  filePath: string
  fileName: string
  thumbnail: string | null
  fileSize: number
  lastOpened: number
}

export interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
}

export interface ClipperAPI {
  // Window
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void

  // Dialogs
  openFileDialog: () => Promise<string | null>
  openFolderDialog: (defaultPath?: string) => Promise<string | null>
  saveFileDialog: (defaultPath: string) => Promise<string | null>
  showInExplorer: (filePath: string) => void

  // File system
  readDirectory: (dirPath: string) => Promise<DirectoryEntry[]>
  getHomeDirectory: () => Promise<string>

  // FFmpeg
  probeVideo: (filePath: string) => Promise<VideoMetadata>
  generateThumbnails: (filePath: string, count: number, height: number) => Promise<string[]>
  exportTrimmed: (options: ExportOptions) => Promise<void>
  cancelExport: () => Promise<void>

  // Export events
  onExportProgress: (callback: (data: ExportProgress) => void) => () => void
  onExportComplete: (callback: (outputPath: string) => void) => () => void
  onExportError: (callback: (error: string) => void) => () => void

  // Store
  getRecentFiles: () => Promise<RecentFileEntry[]>
  addRecentFile: (entry: RecentFileEntry) => Promise<void>
  removeRecentFile: (filePath: string) => Promise<void>
  clearRecentFiles: () => Promise<void>
  getLastDirectory: () => Promise<string>
  setLastDirectory: (path: string) => Promise<void>
}
