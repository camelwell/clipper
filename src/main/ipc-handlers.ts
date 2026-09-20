import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { probeVideo, generateThumbnails, exportTrimmed, cancelExport } from './ffmpeg'
import * as history from './file-history'
import type { ExportOptions, DirectoryEntry } from '../preload/types'
import os from 'os'

export function registerIpcHandlers(): void {
  // === Dialogs ===
  ipcMain.handle('dialog:open-file', async () => {
    const lastDir = history.getLastDirectory()
    const result = await dialog.showOpenDialog({
      title: 'Open MP4 File',
      defaultPath: lastDir || undefined,
      filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    history.setLastDirectory(path.dirname(filePath))
    return filePath
  })

  ipcMain.handle('dialog:open-folder', async (_event, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      title: 'Choose Output Folder',
      defaultPath: defaultPath || undefined,
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:save-file', async (_event, defaultPath: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Save Trimmed Video',
      defaultPath,
      filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.on('shell:show-in-explorer', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // === File System ===
  ipcMain.handle('fs:read-directory', async (_event, dirPath: string): Promise<DirectoryEntry[]> => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      const results: DirectoryEntry[] = []

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        if (entry.isDirectory()) {
          results.push({
            name: entry.name,
            path: path.join(dirPath, entry.name),
            isDirectory: true
          })
        } else if (entry.name.toLowerCase().endsWith('.mp4')) {
          let size = 0
          try {
            const stat = fs.statSync(path.join(dirPath, entry.name))
            size = stat.size
          } catch { /* ignore */ }
          results.push({
            name: entry.name,
            path: path.join(dirPath, entry.name),
            isDirectory: false,
            size
          })
        }
      }

      // Sort: directories first, then alphabetically
      results.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })

      return results
    } catch {
      return []
    }
  })

  ipcMain.handle('fs:home-directory', () => os.homedir())

  // === FFmpeg ===
  ipcMain.handle('ffmpeg:probe', async (_event, filePath: string) => {
    return probeVideo(filePath)
  })

  ipcMain.handle(
    'ffmpeg:thumbnails',
    async (_event, filePath: string, duration: number, count: number, height: number) => {
      return generateThumbnails(filePath, duration, count, height)
    }
  )

  ipcMain.handle('ffmpeg:export', async (event, options: ExportOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    try {
      await exportTrimmed(options, (percent, timemark) => {
        win?.webContents.send('export:progress', { percent, timemark })
      })
      win?.webContents.send('export:complete', options.outputPath)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      win?.webContents.send('export:error', message)
    }
  })

  ipcMain.handle('ffmpeg:cancel-export', () => {
    cancelExport()
  })

  // === Store ===
  ipcMain.handle('store:get-recent-files', () => history.getRecentFiles())
  ipcMain.handle('store:add-recent-file', (_event, entry) => history.addRecentFile(entry))
  ipcMain.handle('store:remove-recent-file', (_event, filePath: string) => history.removeRecentFile(filePath))
  ipcMain.handle('store:clear-recent-files', () => history.clearRecentFiles())
  ipcMain.handle('store:get-last-directory', () => history.getLastDirectory())
  ipcMain.handle('store:set-last-directory', (_event, dir: string) => history.setLastDirectory(dir))
}
