import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

export interface Peer {
  id: string
  name: string
}

export interface Annotation {
  id: string
  type: 'rect' | 'arrow' | 'text'
  x: number
  y: number
  width: number
  height: number
  color: string
  lineWidth: number
  fontSize: number
  text: string
  peerId: string
  timestamp: number
}

const COLORS = ['#ff4444', '#4488ff', '#44cc44', '#ffcc00', '#ffffff', '#000000']

interface StoreState {
  page: 'home' | 'meeting'
  roomId: string
  password: string
  displayName: string
  isHost: boolean
  peers: Peer[]
  selfId: string
  isMuted: boolean
  isScreenSharing: boolean
  screenSharerPeerId: string | null
  screenStream: MediaStream | null
  annotations: Annotation[]
  activeTool: 'rect' | 'arrow' | 'text' | null
  activeColor: string
  lineWidth: number
  fontSize: number
  error: string | null
  localStream: MediaStream | null
}

interface StoreContextValue extends StoreState {
  setPage: (page: 'home' | 'meeting') => void
  setRoomId: (roomId: string) => void
  setPassword: (password: string) => void
  setDisplayName: (displayName: string) => void
  setIsHost: (isHost: boolean) => void
  addPeer: (peer: Peer) => void
  removePeer: (peerId: string) => void
  setSelfId: (id: string) => void
  setIsMuted: (muted: boolean) => void
  setIsScreenSharing: (sharing: boolean) => void
  setScreenSharerPeerId: (id: string | null) => void
  setScreenStream: (stream: MediaStream | null) => void
  setAnnotations: (annotations: Annotation[]) => void
  addAnnotation: (annotation: Annotation) => void
  removeAnnotation: (id: string) => void
  clearAnnotations: () => void
  setActiveTool: (tool: 'rect' | 'arrow' | 'text' | null) => void
  setActiveColor: (color: string) => void
  setLineWidth: (width: number) => void
  setFontSize: (size: number) => void
  setError: (error: string | null) => void
  setLocalStream: (stream: MediaStream | null) => void
  reset: () => void
  getRefs: () => {
    isMutedRef: React.MutableRefObject<boolean>
    activeToolRef: React.MutableRefObject<'rect' | 'arrow' | 'text' | null>
    activeColorRef: React.MutableRefObject<string>
    lineWidthRef: React.MutableRefObject<number>
    fontSizeRef: React.MutableRefObject<number>
  }
}

const defaultState: StoreState = {
  page: 'home',
  roomId: '',
  password: '',
  displayName: '',
  isHost: false,
  peers: [],
  selfId: '',
  isMuted: false,
  isScreenSharing: false,
  screenSharerPeerId: null,
  screenStream: null,
  annotations: [],
  activeTool: null,
  activeColor: COLORS[0],
  lineWidth: 3,
  fontSize: 18,
  error: null,
  localStream: null
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<StoreState['page']>(defaultState.page)
  const [roomId, setRoomId] = useState(defaultState.roomId)
  const [password, setPassword] = useState(defaultState.password)
  const [displayName, setDisplayName] = useState(defaultState.displayName)
  const [isHost, setIsHost] = useState(defaultState.isHost)
  const [peers, setPeers] = useState<Peer[]>([])
  const [selfId, setSelfId] = useState(defaultState.selfId)
  const [isMuted, setIsMuted] = useState(defaultState.isMuted)
  const [isScreenSharing, setIsScreenSharing] = useState(defaultState.isScreenSharing)
  const [screenSharerPeerId, setScreenSharerPeerId] = useState<string | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeTool, setActiveTool] = useState<StoreState['activeTool']>(defaultState.activeTool)
  const [activeColor, setActiveColor] = useState(defaultState.activeColor)
  const [lineWidth, setLineWidth] = useState(defaultState.lineWidth)
  const [fontSize, setFontSize] = useState(defaultState.fontSize)
  const [error, setError] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  const isMutedRef = useRef(isMuted)
  isMutedRef.current = isMuted
  const activeToolRef = useRef(activeTool)
  activeToolRef.current = activeTool
  const activeColorRef = useRef(activeColor)
  activeColorRef.current = activeColor
  const lineWidthRef = useRef(lineWidth)
  lineWidthRef.current = lineWidth
  const fontSizeRef = useRef(fontSize)
  fontSizeRef.current = fontSize

  const addPeer = useCallback((peer: Peer) => {
    setPeers(prev => {
      if (prev.find(p => p.id === peer.id)) return prev
      return [...prev, peer]
    })
  }, [])

  const removePeer = useCallback((peerId: string) => {
    setPeers(prev => prev.filter(p => p.id !== peerId))
  }, [])

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation])
  }, [])

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id))
  }, [])

  const clearAnnotations = useCallback(() => {
    setAnnotations([])
  }, [])

  const reset = useCallback(() => {
    setPage(defaultState.page)
    setRoomId(defaultState.roomId)
    setPassword(defaultState.password)
    setDisplayName(defaultState.displayName)
    setIsHost(defaultState.isHost)
    setPeers([])
    setSelfId(defaultState.selfId)
    setIsMuted(defaultState.isMuted)
    setIsScreenSharing(defaultState.isScreenSharing)
    setScreenSharerPeerId(defaultState.screenSharerPeerId)
    setScreenStream(defaultState.screenStream)
    setAnnotations([])
    setActiveTool(defaultState.activeTool)
    setActiveColor(defaultState.activeColor)
    setLineWidth(defaultState.lineWidth)
    setFontSize(defaultState.fontSize)
    setError(null)
    setLocalStream(null)
  }, [])

  const getRefs = useCallback(() => ({
    isMutedRef,
    activeToolRef,
    activeColorRef,
    lineWidthRef,
    fontSizeRef
  }), [])

  const value: StoreContextValue = {
    page, setPage,
    roomId, setRoomId,
    password, setPassword,
    displayName, setDisplayName,
    isHost, setIsHost,
    peers, addPeer, removePeer,
    selfId, setSelfId,
    isMuted, setIsMuted,
    isScreenSharing, setIsScreenSharing,
    screenSharerPeerId, setScreenSharerPeerId,
    screenStream, setScreenStream,
    annotations, setAnnotations, addAnnotation, removeAnnotation, clearAnnotations,
    activeTool, setActiveTool,
    activeColor, setActiveColor,
    lineWidth, setLineWidth,
    fontSize, setFontSize,
    error, setError,
    localStream, setLocalStream,
    reset,
    getRefs
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
