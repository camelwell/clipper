import { create } from 'zustand'

interface ExportState {
  isExporting: boolean
  progress: number
  outputPath: string | null
  error: string | null
  useStreamCopy: boolean

  setExporting: (exporting: boolean) => void
  setProgress: (progress: number) => void
  setOutputPath: (path: string | null) => void
  setError: (error: string | null) => void
  setUseStreamCopy: (value: boolean) => void
  reset: () => void
}

export const useExportStore = create<ExportState>((set) => ({
  isExporting: false,
  progress: 0,
  outputPath: null,
  error: null,
  useStreamCopy: true,

  setExporting: (exporting) => set({ isExporting: exporting }),
  setProgress: (progress) => set({ progress }),
  setOutputPath: (path) => set({ outputPath: path }),
  setError: (error) => set({ error }),
  setUseStreamCopy: (value) => set({ useStreamCopy: value }),
  reset: () => set({ isExporting: false, progress: 0, outputPath: null, error: null })
}))
