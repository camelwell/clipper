import { useEffect, useCallback } from 'react'
import { useFileNavStore } from '../stores/fileNavStore'
import { useVideoStore } from '../stores/videoStore'
import { useTrimStore } from '../stores/trimStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useUIStore } from '../stores/uiStore'
import { formatFileSize } from '../utils/formatTime'
import FolderIcon from '../assets/folder.svg'
import FileIcon from '../assets/file.svg'
import '../styles/file-panel.css'

export default function FilePanel(): JSX.Element {
  const isPanelOpen = useFileNavStore((s) => s.isPanelOpen)
  const activeTab = useFileNavStore((s) => s.activeTab)
  const setActiveTab = useFileNavStore((s) => s.setActiveTab)
  const recentFiles = useFileNavStore((s) => s.recentFiles)
  const currentDirectory = useFileNavStore((s) => s.currentDirectory)
  const directoryEntries = useFileNavStore((s) => s.directoryEntries)
  const loadDirectory = useFileNavStore((s) => s.loadDirectory)
  const loadRecentFiles = useFileNavStore((s) => s.loadRecentFiles)
  const removeRecentFile = useFileNavStore((s) => s.removeRecentFile)
  const clearRecentFiles = useFileNavStore((s) => s.clearRecentFiles)
  const addToast = useUIStore((s) => s.addToast)

  useEffect(() => {
    loadRecentFiles()
    window.clipperAPI.getLastDirectory().then((dir) => {
      if (dir) loadDirectory(dir)
      else window.clipperAPI.getHomeDirectory().then((home) => loadDirectory(home))
    })
  }, [loadDirectory, loadRecentFiles])

  const openFile = useCallback(async (filePath: string) => {
    try {
      await useVideoStore.getState().loadVideo(filePath)
      useTrimStore.getState().resetTrim(useVideoStore.getState().duration)
      usePlaybackStore.getState().setCurrentTime(0)
      usePlaybackStore.getState().setIsPlaying(false)
      loadRecentFiles()
    } catch {
      addToast('Failed to load video', 'error')
    }
  }, [addToast, loadRecentFiles])

  const handleOpenDialog = async (): Promise<void> => {
    const filePath = await window.clipperAPI.openFileDialog()
    if (filePath) openFile(filePath)
  }

  const navigateUp = (): void => {
    const parent = currentDirectory.replace(/[\\/][^\\/]+$/, '')
    if (parent && parent !== currentDirectory) {
      loadDirectory(parent)
    }
  }

  // Build breadcrumb segments
  const segments = currentDirectory.split(/[\\/]/).filter(Boolean)

  return (
    <div className={`file-panel ${isPanelOpen ? '' : 'collapsed'}`}>
      <div className="file-panel-header">
        <span className="file-panel-title">Files</span>
      </div>

      <div className="file-panel-tabs">
        <button
          className={`file-panel-tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent
        </button>
        <button
          className={`file-panel-tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse
        </button>
      </div>

      <div className="file-panel-content">
        <button className="file-panel-open-btn" onClick={handleOpenDialog}>
          + Open File
        </button>

        {activeTab === 'recent' ? (
          <>
            {recentFiles.length === 0 ? (
              <div className="empty-panel-msg">No recent files</div>
            ) : (
              <>
                {recentFiles.map((file) => (
                  <div key={file.filePath} className="recent-file-item" onDoubleClick={() => openFile(file.filePath)}>
                    <div className="recent-file-thumb">
                      {file.thumbnail ? (
                        <img src={file.thumbnail} alt="" />
                      ) : (
                        <span className="recent-file-thumb-placeholder">
                          <img src={FileIcon} alt="" style={{ width: 14, height: 14, opacity: 0.4 }} />
                        </span>
                      )}
                    </div>
                    <div className="recent-file-info">
                      <div className="recent-file-name">{file.fileName}</div>
                      <div className="recent-file-meta">{formatFileSize(file.fileSize)}</div>
                    </div>
                    <button
                      className="recent-file-remove"
                      onClick={(e) => { e.stopPropagation(); removeRecentFile(file.filePath) }}
                      title="Remove"
                    >
                      {'\u2715'}
                    </button>
                  </div>
                ))}
                <button className="clear-all-btn" onClick={clearRecentFiles}>
                  Clear All
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="breadcrumb">
              <button className="playback-btn" style={{ width: 22, height: 22, fontSize: 11 }} onClick={navigateUp} title="Up">
                {'\u2191'}
              </button>
              {segments.slice(-3).map((seg, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: 'var(--text-muted)' }}>/</span>}
                  <span
                    className="breadcrumb-segment"
                    onClick={() => {
                      const idx = currentDirectory.indexOf(seg) + seg.length
                      loadDirectory(currentDirectory.substring(0, idx))
                    }}
                  >
                    {seg}
                  </span>
                </span>
              ))}
            </div>

            {directoryEntries.length === 0 ? (
              <div className="empty-panel-msg">No MP4 files here</div>
            ) : (
              directoryEntries.map((entry) => (
                <div
                  key={entry.path}
                  className={`dir-entry ${entry.isDirectory ? 'is-folder' : 'is-file'}`}
                  onClick={() => entry.isDirectory ? loadDirectory(entry.path) : undefined}
                  onDoubleClick={() => !entry.isDirectory ? openFile(entry.path) : undefined}
                >
                  <span className="dir-entry-icon">
                    <img src={entry.isDirectory ? FolderIcon : FileIcon} alt="" className="icon" />
                  </span>
                  <span className="dir-entry-name">{entry.name}</span>
                  {!entry.isDirectory && entry.size && (
                    <span className="dir-entry-size">{formatFileSize(entry.size)}</span>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
