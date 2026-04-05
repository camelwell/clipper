import { create } from 'zustand'
import type { RecentFileEntry, DirectoryEntry } from '../../../preload/types'

interface FileNavState {
  recentFiles: RecentFileEntry[]
  currentDirectory: string
  directoryEntries: DirectoryEntry[]
  isPanelOpen: boolean
  activeTab: 'recent' | 'browse'

  setRecentFiles: (files: RecentFileEntry[]) => void
  addRecentFile: (entry: RecentFileEntry) => void
  removeRecentFile: (filePath: string) => void
  clearRecentFiles: () => void
  setCurrentDirectory: (path: string) => void
  setDirectoryEntries: (entries: DirectoryEntry[]) => void
  togglePanel: () => void
  setActiveTab: (tab: 'recent' | 'browse') => void
  loadDirectory: (dirPath: string) => Promise<void>
  loadRecentFiles: () => Promise<void>
}

export const useFileNavStore = create<FileNavState>((set) => ({
  recentFiles: [],
  currentDirectory: '',
  directoryEntries: [],
  isPanelOpen: true,
  activeTab: 'recent',

  setRecentFiles: (files) => set({ recentFiles: files }),

  addRecentFile: (entry) =>
    set((s) => {
      const filtered = s.recentFiles.filter((f) => f.filePath !== entry.filePath)
      return { recentFiles: [entry, ...filtered].slice(0, 20) }
    }),

  removeRecentFile: (filePath) => {
    set((s) => ({
      recentFiles: s.recentFiles.filter((f) => f.filePath !== filePath)
    }))
    window.clipperAPI.removeRecentFile(filePath)
  },

  clearRecentFiles: () => {
    set({ recentFiles: [] })
    window.clipperAPI.clearRecentFiles()
  },

  setCurrentDirectory: (path) => set({ currentDirectory: path }),
  setDirectoryEntries: (entries) => set({ directoryEntries: entries }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),

  loadDirectory: async (dirPath: string) => {
    const entries = await window.clipperAPI.readDirectory(dirPath)
    set({ currentDirectory: dirPath, directoryEntries: entries })
    window.clipperAPI.setLastDirectory(dirPath)
  },

  loadRecentFiles: async () => {
    const files = await window.clipperAPI.getRecentFiles()
    set({ recentFiles: files })
  }
}))
