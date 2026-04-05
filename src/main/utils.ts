import { app } from 'electron'
import path from 'path'

export function getFFmpegPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegPath: string = require('ffmpeg-static')
  if (app.isPackaged) {
    return ffmpegPath.replace('app.asar', 'app.asar.unpacked')
  }
  return ffmpegPath
}

export function getFFprobePath(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffprobePath: string = require('ffprobe-static').path
  if (app.isPackaged) {
    return ffprobePath.replace('app.asar', 'app.asar.unpacked')
  }
  return ffprobePath
}

export function getTempDir(): string {
  return path.join(app.getPath('temp'), 'clipper-thumbnails')
}
