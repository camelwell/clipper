import { contextBridge, ipcRenderer, webUtils, IpcRendererEvent } from 'electron'
import type { ClipperAPI, ExportOptions, ExportProgress } from './types'

const api: ClipperAPI = {
  // Window
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Dialogs
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
  openFolderDialog: (defaultPath?: string) => ipcRenderer.invoke('dialog:open-folder', defaultPath),
  saveFileDialog: (defaultPath: string) => ipcRenderer.invoke('dialog:save-file', defaultPath),
  showInExplorer: (filePath: string) => ipcRenderer.send('shell:show-in-explorer', filePath),

  // File system
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:read-directory', dirPath),
  getHomeDirectory: () => ipcRenderer.invoke('fs:home-directory'),
  // Electron 32+ no longer exposes File.path to the renderer; this is the
  // sanctioned way to resolve a dropped File to its on-disk path.
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // FFmpeg
  probeVideo: (filePath: string) => ipcRenderer.invoke('ffmpeg:probe', filePath),
  generateThumbnails: (filePath: string, duration: number, count: number, height: number) =>
    ipcRenderer.invoke('ffmpeg:thumbnails', filePath, duration, count, height),
  exportTrimmed: (options: ExportOptions) => ipcRenderer.invoke('ffmpeg:export', options),
  cancelExport: () => ipcRenderer.invoke('ffmpeg:cancel-export'),

  // Export events
  onExportProgress: (callback: (data: ExportProgress) => void) => {
    const handler = (_event: IpcRendererEvent, data: ExportProgress): void => callback(data)
    ipcRenderer.on('export:progress', handler)
    return () => { ipcRenderer.removeListener('export:progress', handler) }
  },
  onExportComplete: (callback: (outputPath: string) => void) => {
    const handler = (_event: IpcRendererEvent, outputPath: string): void => callback(outputPath)
    ipcRenderer.on('export:complete', handler)
    return () => { ipcRenderer.removeListener('export:complete', handler) }
  },
  onExportError: (callback: (error: string) => void) => {
    const handler = (_event: IpcRendererEvent, error: string): void => callback(error)
    ipcRenderer.on('export:error', handler)
    return () => { ipcRenderer.removeListener('export:error', handler) }
  },

  // Store
  getRecentFiles: () => ipcRenderer.invoke('store:get-recent-files'),
  addRecentFile: (entry) => ipcRenderer.invoke('store:add-recent-file', entry),
  removeRecentFile: (filePath: string) => ipcRenderer.invoke('store:remove-recent-file', filePath),
  clearRecentFiles: () => ipcRenderer.invoke('store:clear-recent-files'),
  getLastDirectory: () => ipcRenderer.invoke('store:get-last-directory'),
  setLastDirectory: (path: string) => ipcRenderer.invoke('store:set-last-directory', path)
}

contextBridge.exposeInMainWorld('clipperAPI', api)
