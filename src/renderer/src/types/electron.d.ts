import type { ClipperAPI } from '../../preload/types'

declare global {
  interface Window {
    clipperAPI: ClipperAPI
  }
}

export {}
