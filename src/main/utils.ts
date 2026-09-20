import { app } from 'electron'
import path from 'path'

export function getFFmpegPath(): string {
  // Packaged: the binary is copied into resources/ by electron-builder
  // (see extraResources) so no node_modules ship with the app at all.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ffmpeg.exe')
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('ffmpeg-static')
}

export function getTempDir(): string {
  return path.join(app.getPath('temp'), 'clipper-thumbnails')
}
