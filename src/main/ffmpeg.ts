import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getFFmpegPath, getTempDir } from './utils'
import type { VideoMetadata, ExportOptions } from '../preload/types'

// All ffmpeg work goes through the one bundled binary. Metadata is parsed
// from ffmpeg's own stream summary, so no separate ffprobe is shipped.

const ffmpegPath = getFFmpegPath()

interface FfmpegRun {
  done: Promise<void>
  cancel: () => void
}

class CancelledError extends Error {
  constructor() {
    super('cancelled')
    this.name = 'CancelledError'
  }
}

/**
 * Spawn ffmpeg. Resolves on exit code 0; rejects with the tail of stderr
 * otherwise, or with CancelledError if `cancel()` was called.
 * `onProgress` receives the output time in seconds (from `-progress pipe:1`).
 */
function runFfmpeg(args: string[], onProgress?: (seconds: number) => void): FfmpegRun {
  let child: ChildProcess | null = null
  let cancelled = false

  const done = new Promise<void>((resolve, reject) => {
    const fullArgs = [
      '-hide_banner', '-nostdin', '-y',
      ...(onProgress ? ['-progress', 'pipe:1', '-nostats'] : []),
      ...args
    ]

    child = spawn(ffmpegPath, fullArgs, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })

    let stdoutBuf = ''
    child.stdout!.on('data', (chunk: Buffer) => {
      if (!onProgress) return
      stdoutBuf += chunk.toString()
      const lines = stdoutBuf.split('\n')
      stdoutBuf = lines.pop() ?? ''
      for (const line of lines) {
        const m = /^out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line)
        if (m) onProgress(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]))
      }
    })

    const stderrTail: string[] = []
    child.stderr!.on('data', (chunk: Buffer) => {
      stderrTail.push(...chunk.toString().split(/\r?\n/).filter(Boolean))
      if (stderrTail.length > 20) stderrTail.splice(0, stderrTail.length - 20)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (cancelled) return reject(new CancelledError())
      if (code === 0) return resolve()
      reject(new Error(stderrTail[stderrTail.length - 1] ?? `ffmpeg exited with code ${code}`))
    })
  })

  return {
    done,
    cancel: () => {
      cancelled = true
      child?.kill('SIGKILL')
    }
  }
}

// A killed ffmpeg can hold its files for a moment on Windows; retry and never throw
function removeQuietly(target: string): void {
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    // Best effort
  }
}

// Parse an ffmpeg rate like "29.97" from "29.97 fps"
function parseNumber(match: RegExpExecArray | null): number {
  const n = match ? Number(match[1]) : NaN
  return Number.isFinite(n) ? n : 0
}

export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  // A bare `-i` exits non-zero ("At least one output file must be specified")
  // after printing the stream summary to stderr, which is all we need.
  const stderr = await new Promise<string>((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-nostdin', '-i', filePath], {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true
    })
    let out = ''
    child.stderr!.on('data', (chunk: Buffer) => { out += chunk.toString() })
    child.on('error', reject)
    child.on('close', () => resolve(out))
  })

  const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
  if (!durationMatch) throw new Error('Could not read video metadata')
  const duration =
    Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])

  const videoLine = stderr.split(/\r?\n/).find((line) => /Stream #\d+:\d+.*: Video: /.test(line))
  if (!videoLine) throw new Error('No video stream found')

  const codec = /Video: (\w+)/.exec(videoLine)?.[1] ?? 'unknown'
  // Dimensions are always ", WxH" — anchoring on the comma avoids hex ids like 0x31637661
  const dims = /, (\d+)x(\d+)/.exec(videoLine)
  const width = dims ? Number(dims[1]) : 0
  const height = dims ? Number(dims[2]) : 0
  // "fps" is the average rate; "tbr" is ffmpeg's timebase guess. Prefer the former.
  const fps =
    parseNumber(/(\d+(?:\.\d+)?) fps/.exec(videoLine)) ||
    parseNumber(/(\d+(?:\.\d+)?) tbr/.exec(videoLine)) ||
    30
  const bitrate = parseNumber(/bitrate:\s*(\d+) kb\/s/.exec(stderr))
  const fileSize = (await fs.promises.stat(filePath)).size

  return { duration, width, height, codec, fps: Math.round(fps * 100) / 100, bitrate, fileSize }
}

let currentThumbnailRun: FfmpegRun | null = null

export async function generateThumbnails(
  filePath: string,
  duration: number,
  count: number,
  height: number
): Promise<string[]> {
  // A new request supersedes any in-flight one (the user opened another file)
  currentThumbnailRun?.cancel()

  const baseDir = getTempDir()
  fs.mkdirSync(baseDir, { recursive: true })
  const tempDir = fs.mkdtempSync(path.join(baseDir, 'thumbs-'))
  const interval = Math.max(duration / Math.max(count, 1), 0.5)

  // Decode keyframes only. The strip doesn't need frame-exact thumbnails,
  // and this avoids decoding every frame of the file (10-50x faster).
  // eof_action=pass makes the fps filter still emit the final slot when
  // no frame follows the last keyframe, so the count comes out exact.
  const run = runFfmpeg([
    '-skip_frame', 'nokey',
    '-i', filePath,
    '-vf', `fps=1/${interval}:eof_action=pass,scale=-1:${height}`,
    '-q:v', '8',
    '-fps_mode', 'vfr',
    path.join(tempDir, 'thumb_%04d.jpg')
  ])
  currentThumbnailRun = run

  try {
    await run.done
    return fs.readdirSync(tempDir)
      .filter((f) => f.endsWith('.jpg'))
      .sort()
      .map((f) => `data:image/jpeg;base64,${fs.readFileSync(path.join(tempDir, f)).toString('base64')}`)
  } finally {
    if (currentThumbnailRun === run) currentThumbnailRun = null
    removeQuietly(tempDir)
  }
}

let currentExportRun: FfmpegRun | null = null

export async function exportTrimmed(
  options: ExportOptions,
  onProgress: (percent: number, timemark: string) => void
): Promise<void> {
  const duration = options.trimEnd - options.trimStart

  // Input-side seek: ffmpeg jumps straight to the keyframe before trimStart
  // instead of decoding everything from 0:00. For stream copy this is the
  // keyframe-aligned cut the UI describes; for re-encodes it stays
  // frame-accurate because ffmpeg drops the decoded frames before the target.
  const args = ['-ss', String(options.trimStart), '-i', options.inputPath, '-t', String(duration)]
  if (options.useStreamCopy) {
    args.push('-c', 'copy')
  } else {
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-c:a', 'aac')
  }
  args.push('-avoid_negative_ts', 'make_zero', options.outputPath)

  const run = runFfmpeg(args, (seconds) => {
    const percent = duration > 0 ? (seconds / duration) * 100 : 0
    onProgress(Math.min(Math.max(percent, 0), 100), seconds.toFixed(2))
  })
  currentExportRun = run

  try {
    await run.done
  } catch (err) {
    // Don't leave a half-written file behind
    removeQuietly(options.outputPath)
    throw err instanceof CancelledError ? new Error('Export cancelled') : err
  } finally {
    if (currentExportRun === run) currentExportRun = null
  }
}

export function cancelExport(): void {
  currentExportRun?.cancel()
  currentExportRun = null
}
