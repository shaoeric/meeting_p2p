/// <reference types="vite/client" />

interface Window {
  api: {
    getSources: () => Promise<{ id: string; name: string; thumbnail: string }[]>
  }
  electron: unknown
}
