import { useState, useRef, useEffect, useCallback } from 'react'
import { useVideoStore } from '../stores/videoStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useTrimStore } from '../stores/trimStore'
import { useUIStore } from '../stores/uiStore'
import { useFileNavStore } from '../stores/fileNavStore'
import logoIcon from '../assets/clipper_logo.png'
import '../styles/titlebar.css'

export default function TitleBar(): JSX.Element {
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const filePath = useVideoStore((s) => s.filePath)
  const fileName = useVideoStore((s) => s.fileName)

  const minimize = (): void => window.clipperAPI.minimizeWindow()
  const maximize = (): void => window.clipperAPI.maximizeWindow()
  const close = (): void => window.clipperAPI.closeWindow()

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const openFile = useCallback(async () => {
    setMenuOpen(null)
    const path = await window.clipperAPI.openFileDialog()
    if (path) {
      await useVideoStore.getState().loadVideo(path)
      useTrimStore.getState().resetTrim(useVideoStore.getState().duration)
      usePlaybackStore.getState().setCurrentTime(0)
      usePlaybackStore.getState().setIsPlaying(false)
      useFileNavStore.getState().loadRecentFiles()
    }
  }, [])

  const newFile = useCallback(() => {
    setMenuOpen(null)
    useVideoStore.getState().clearVideo()
    useTrimStore.getState().resetTrim(0)
    usePlaybackStore.getState().setCurrentTime(0)
    usePlaybackStore.getState().setIsPlaying(false)
  }, [])

  const exportFile = useCallback(() => {
    setMenuOpen(null)
    if (filePath) useUIStore.getState().openExportDialog()
  }, [filePath])

  const togglePanel = useCallback(() => {
    setMenuOpen(null)
    useFileNavStore.getState().togglePanel()
  }, [])

  const quit = useCallback(() => {
    window.clipperAPI.closeWindow()
  }, [])

  return (
    <div className="titlebar">
      <img src={logoIcon} alt="" className="titlebar-logo-icon" draggable={false} />
      <span className="titlebar-logo">clipper</span>

      {/* Menu bar */}
      <div className="titlebar-menu" ref={menuRef}>
        <div className="menu-item-wrapper">
          <button
            className={`menu-trigger ${menuOpen === 'file' ? 'active' : ''}`}
            onClick={() => setMenuOpen(menuOpen === 'file' ? null : 'file')}
            onMouseEnter={() => menuOpen && setMenuOpen('file')}
          >
            File
          </button>
          {menuOpen === 'file' && (
            <div className="menu-dropdown">
              <button className="menu-option" onClick={openFile}>
                <span>Open File...</span>
                <span className="menu-shortcut">Ctrl+O</span>
              </button>
              <button className="menu-option" onClick={newFile}>
                <span>New</span>
                <span className="menu-shortcut">Ctrl+W</span>
              </button>
              <div className="menu-divider" />
              <button className="menu-option" onClick={exportFile} disabled={!filePath}>
                <span>Export...</span>
                <span className="menu-shortcut">Ctrl+E</span>
              </button>
              <div className="menu-divider" />
              <button className="menu-option" onClick={togglePanel}>
                <span>Toggle File Panel</span>
                <span className="menu-shortcut">Ctrl+B</span>
              </button>
              <div className="menu-divider" />
              <button className="menu-option" onClick={quit}>
                <span>Quit</span>
                <span className="menu-shortcut">Ctrl+Q</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current file name */}
      {fileName && (
        <span className="titlebar-filename">{fileName}</span>
      )}

      <div className="titlebar-spacer" />
      <div className="titlebar-controls">
        <button className="titlebar-btn minimize" onClick={minimize} title="Minimize">
          &#x2014;
        </button>
        <button className="titlebar-btn maximize" onClick={maximize} title="Maximize">
          &#x25A1;
        </button>
        <button className="titlebar-btn close" onClick={close} title="Close">
          &#x2715;
        </button>
      </div>
    </div>
  )
}
