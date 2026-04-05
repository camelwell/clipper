import { useState, useEffect } from 'react'
import { useVideoStore } from '../stores/videoStore'
import { useTrimStore } from '../stores/trimStore'
import { useExportStore } from '../stores/exportStore'
import { useUIStore } from '../stores/uiStore'
import { formatTime } from '../utils/formatTime'
import FolderIcon from '../assets/folder.svg'
import '../styles/export.css'

export default function ExportDialog(): JSX.Element | null {
  const isOpen = useUIStore((s) => s.isExportDialogOpen)
  const closeDialog = useUIStore((s) => s.closeExportDialog)
  const addToast = useUIStore((s) => s.addToast)

  const filePath = useVideoStore((s) => s.filePath)
  const fileName = useVideoStore((s) => s.fileName)
  const trimStart = useTrimStore((s) => s.trimStart)
  const trimEnd = useTrimStore((s) => s.trimEnd)

  const isExporting = useExportStore((s) => s.isExporting)
  const progress = useExportStore((s) => s.progress)
  const useStreamCopy = useExportStore((s) => s.useStreamCopy)
  const setUseStreamCopy = useExportStore((s) => s.setUseStreamCopy)
  const setExporting = useExportStore((s) => s.setExporting)
  const setProgress = useExportStore((s) => s.setProgress)
  const reset = useExportStore((s) => s.reset)

  const [outputName, setOutputName] = useState('')
  const [outputFolder, setOutputFolder] = useState('')

  // Initialize defaults when dialog opens
  useEffect(() => {
    if (isOpen && fileName && filePath) {
      const base = fileName.replace(/\.mp4$/i, '')
      setOutputName(`${base}_trimmed.mp4`)
      // Default output folder = same as source file
      const sep = filePath.includes('/') ? '/' : '\\'
      const dir = filePath.substring(0, filePath.lastIndexOf(sep))
      setOutputFolder(dir)
    }
  }, [isOpen, fileName, filePath])

  // Listen for export events
  useEffect(() => {
    if (!isOpen) return

    const cleanupProgress = window.clipperAPI.onExportProgress((data) => {
      setProgress(data.percent)
    })

    const cleanupComplete = window.clipperAPI.onExportComplete((outputPath) => {
      setExporting(false)
      addToast(`Exported to ${outputPath.split(/[\\/]/).pop()}`, 'success')
      closeDialog()
      reset()
    })

    const cleanupError = window.clipperAPI.onExportError((error) => {
      setExporting(false)
      if (error !== 'Export cancelled') {
        addToast(`Export failed: ${error}`, 'error')
      }
      reset()
    })

    return () => {
      cleanupProgress()
      cleanupComplete()
      cleanupError()
    }
  }, [isOpen, setProgress, setExporting, addToast, closeDialog, reset])

  if (!isOpen || !filePath) return null

  const trimmedDuration = trimEnd - trimStart

  const changeOutputFolder = async (): Promise<void> => {
    const folder = await window.clipperAPI.openFolderDialog(outputFolder)
    if (folder) setOutputFolder(folder)
  }

  const handleExport = async (): Promise<void> => {
    if (!outputName.trim()) {
      addToast('Enter a file name', 'error')
      return
    }

    const sep = outputFolder.includes('/') ? '/' : '\\'
    const fullPath = `${outputFolder}${sep}${outputName}`

    setExporting(true)
    setProgress(0)

    await window.clipperAPI.exportTrimmed({
      inputPath: filePath,
      outputPath: fullPath,
      trimStart,
      trimEnd,
      useStreamCopy
    })
  }

  const handleCancel = (): void => {
    if (isExporting) {
      window.clipperAPI.cancelExport()
      addToast('Export cancelled', 'info')
      reset()
    } else {
      closeDialog()
    }
  }

  // Shorten folder path for display
  const folderDisplay = outputFolder.length > 45
    ? '...' + outputFolder.slice(-42)
    : outputFolder

  return (
    <div className="export-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isExporting) closeDialog() }}>
      <div className="export-dialog">
        <div className="export-title">Export</div>

        <div className="export-row">
          <span className="export-label">Source</span>
          <span className="export-value">{fileName}</span>
        </div>
        <div className="export-row">
          <span className="export-label">Trim Range</span>
          <span className="export-value">{formatTime(trimStart)} &ndash; {formatTime(trimEnd)}</span>
        </div>
        <div className="export-row">
          <span className="export-label">Duration</span>
          <span className="export-value">{formatTime(trimmedDuration)}</span>
        </div>

        {/* Output folder */}
        <div className="export-field-label">Output Folder</div>
        <div className="export-folder-row">
          <span className="export-folder-path" title={outputFolder}>{folderDisplay}</span>
          <button
            className="export-folder-btn"
            onClick={changeOutputFolder}
            disabled={isExporting}
            title="Change output folder"
          >
            <img src={FolderIcon} alt="" className="icon" />
          </button>
        </div>

        {/* File name */}
        <div className="export-field-label">File Name</div>
        <input
          className="export-filename"
          value={outputName}
          onChange={(e) => setOutputName(e.target.value)}
          disabled={isExporting}
          onKeyDown={(e) => { if (e.key === 'Enter' && !isExporting) handleExport() }}
          autoFocus
        />

        <label className="export-checkbox-row">
          <input
            type="checkbox"
            className="export-checkbox"
            checked={useStreamCopy}
            onChange={(e) => setUseStreamCopy(e.target.checked)}
            disabled={isExporting}
          />
          <span className="export-checkbox-label">Fast Export (Stream Copy)</span>
          <span className="export-checkbox-hint">Keyframe-aligned</span>
        </label>

        {isExporting && (
          <div className="export-progress-container">
            <div className="export-progress-track">
              <div className="export-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="export-progress-text">
              <span>{Math.round(progress)}%</span>
              <span>Exporting...</span>
            </div>
          </div>
        )}

        <div className="export-actions">
          <button className="export-cancel-btn" onClick={handleCancel}>
            {isExporting ? 'Cancel' : 'Close'}
          </button>
          {!isExporting && (
            <button className="export-confirm-btn" onClick={handleExport}>
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
