import Ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import { getFFmpegPath, getFFprobePath, getTempDir } from './utils'
import type { VideoMetadata, ExportOptions } from '../preload/types'

Ffmpeg.setFfmpegPath(getFFmpegPath())
Ffmpeg.setFfprobePath(getFFprobePath())

let currentExportCommand: Ffmpeg.FfmpegCommand | null = null

export function probeVideo(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    Ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err)

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
      if (!videoStream) return reject(new Error('No video stream found'))

      const duration = metadata.format.duration ?? 0
      const width = videoStream.width ?? 0
      const height = videoStream.height ?? 0
      const codec = videoStream.codec_name ?? 'unknown'
      const bitrate = Number(metadata.format.bit_rate ?? 0) / 1000
      const fileSize = Number(metadata.format.size ?? 0)

      // Parse fps from r_frame_rate (e.g., "30000/1001")
      let fps = 30
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/')
        if (parts.length === 2) {
          fps = Number(parts[0]) / Number(parts[1])
        } else {
          fps = Number(parts[0]) || 30
        }
      }

      resolve({ duration, width, height, codec, fps: Math.round(fps * 100) / 100, bitrate, fileSize })
    })
  })
}

export function generateThumbnails(
  filePath: string,
  count: number,
  height: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tempDir = getTempDir()
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
    fs.mkdirSync(tempDir, { recursive: true })

    // First probe to get duration
    Ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err)

      const duration = metadata.format.duration ?? 0
      const interval = duration / count

      Ffmpeg(filePath)
        .outputOptions([
          '-vf', `fps=1/${Math.max(interval, 0.5)},scale=-1:${height}`,
          '-q:v', '8',
          '-vsync', 'vfr'
        ])
        .output(path.join(tempDir, 'thumb_%04d.jpg'))
        .on('end', () => {
          try {
            const files = fs.readdirSync(tempDir)
              .filter((f) => f.endsWith('.jpg'))
              .sort()

            const thumbnails = files.map((f) => {
              const data = fs.readFileSync(path.join(tempDir, f))
              return `data:image/jpeg;base64,${data.toString('base64')}`
            })

            // Cleanup
            fs.rmSync(tempDir, { recursive: true })
            resolve(thumbnails)
          } catch (e) {
            reject(e)
          }
        })
        .on('error', (e) => {
          reject(e)
        })
        .run()
    })
  })
}

export function generateSingleThumbnail(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const tempDir = getTempDir()
    fs.mkdirSync(tempDir, { recursive: true })
    const outPath = path.join(tempDir, `recent_${Date.now()}.jpg`)

    Ffmpeg(filePath)
      .seekInput(1)
      .frames(1)
      .outputOptions(['-vf', 'scale=-1:60', '-q:v', '5'])
      .output(outPath)
      .on('end', () => {
        try {
          const data = fs.readFileSync(outPath)
          const base64 = `data:image/jpeg;base64,${data.toString('base64')}`
          fs.unlinkSync(outPath)
          resolve(base64)
        } catch {
          resolve(null)
        }
      })
      .on('error', () => resolve(null))
      .run()
  })
}

export function exportTrimmed(
  options: ExportOptions,
  onProgress: (percent: number, timemark: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = options.trimEnd - options.trimStart
    const command = Ffmpeg(options.inputPath)
      .setStartTime(options.trimStart)
      .setDuration(duration)

    if (options.useStreamCopy) {
      command.outputOptions(['-c', 'copy', '-avoid_negative_ts', 'make_zero'])
    } else {
      command
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-preset', 'fast', '-crf', '18', '-avoid_negative_ts', 'make_zero'])
    }

    command
      .output(options.outputPath)
      .on('progress', (progress) => {
        const percent = progress.percent ?? (progress.timemark ? 0 : 0)
        onProgress(Math.min(percent, 100), progress.timemark ?? '')
      })
      .on('end', () => {
        currentExportCommand = null
        resolve()
      })
      .on('error', (err) => {
        currentExportCommand = null
        if (err.message.includes('SIGKILL')) {
          reject(new Error('Export cancelled'))
        } else {
          reject(err)
        }
      })

    currentExportCommand = command
    command.run()
  })
}

export function cancelExport(): void {
  if (currentExportCommand) {
    currentExportCommand.kill('SIGKILL')
    currentExportCommand = null
  }
}
