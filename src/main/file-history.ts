import Store from 'electron-store'
import type { RecentFileEntry } from '../preload/types'

interface StoreSchema {
  recentFiles: RecentFileEntry[]
  lastDirectory: string
  windowBounds: { x: number; y: number; width: number; height: number } | null
}

const store = new Store<StoreSchema>({
  name: 'clipper-config',
  defaults: {
    recentFiles: [],
    lastDirectory: '',
    windowBounds: null
  }
})

const MAX_RECENT = 20

export function getRecentFiles(): RecentFileEntry[] {
  return store.get('recentFiles')
}

export function addRecentFile(entry: RecentFileEntry): void {
  const files = store.get('recentFiles').filter((f) => f.filePath !== entry.filePath)
  files.unshift(entry)
  store.set('recentFiles', files.slice(0, MAX_RECENT))
}

export function removeRecentFile(filePath: string): void {
  const files = store.get('recentFiles').filter((f) => f.filePath !== filePath)
  store.set('recentFiles', files)
}

export function clearRecentFiles(): void {
  store.set('recentFiles', [])
}

export function getLastDirectory(): string {
  return store.get('lastDirectory')
}

export function setLastDirectory(dir: string): void {
  store.set('lastDirectory', dir)
}

export function getWindowBounds(): StoreSchema['windowBounds'] {
  return store.get('windowBounds')
}

export function setWindowBounds(bounds: StoreSchema['windowBounds']): void {
  store.set('windowBounds', bounds)
}
