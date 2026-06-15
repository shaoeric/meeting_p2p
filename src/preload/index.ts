import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getSources: (): Promise<{ id: string; name: string; thumbnail: string }[]> => {
    return ipcRenderer.invoke('get-sources')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore define on window in non-isolated context
  window.electron = electronAPI
  // @ts-ignore define on window in non-isolated context
  window.api = api
}
