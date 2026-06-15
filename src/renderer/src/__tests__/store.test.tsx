import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import React from 'react'
import { StoreProvider, useStore } from '../store'

function TestConsumer({ onMount }: { onMount: (store: ReturnType<typeof useStore>) => void }) {
  const store = useStore()
  onMount(store)
  return null
}

describe('Store (React context)', () => {
  it('addPeer adds a peer to the list', () => {
    let store: ReturnType<typeof useStore> = null!

    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )

    act(() => {
      store.addPeer({ id: 'peer-1', name: 'Test Peer' })
    })

    expect(store.peers).toHaveLength(1)
    expect(store.peers[0]).toEqual({ id: 'peer-1', name: 'Test Peer' })
  })

  it('addPeer with duplicate id does not add duplicate', () => {
    let store: ReturnType<typeof useStore> = null!

    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )

    act(() => {
      store.addPeer({ id: 'peer-1', name: 'Test Peer' })
      store.addPeer({ id: 'peer-1', name: 'Duplicate' })
    })

    expect(store.peers).toHaveLength(1)
    expect(store.peers[0].name).toBe('Test Peer')
  })

  it('removePeer removes peer by id', () => {
    let store: ReturnType<typeof useStore> = null!

    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )

    act(() => {
      store.addPeer({ id: 'peer-1', name: 'A' })
      store.addPeer({ id: 'peer-2', name: 'B' })
      store.removePeer('peer-1')
    })

    expect(store.peers).toHaveLength(1)
    expect(store.peers[0].id).toBe('peer-2')
  })

  it('addAnnotation adds annotation', () => {
    let store: ReturnType<typeof useStore> = null!

    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )

    const ann = {
      id: 'ann-1',
      type: 'rect' as const,
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      color: '#ff0000',
      lineWidth: 2,
      fontSize: 16,
      text: 'hello',
      peerId: 'peer-1',
      timestamp: 1234567890
    }

    act(() => {
      store.addAnnotation(ann)
    })

    expect(store.annotations).toHaveLength(1)
    expect(store.annotations[0]).toEqual(ann)
  })

  it('removeAnnotation removes annotation by id', () => {
    let store: ReturnType<typeof useStore> = null!

    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )

    const ann1 = {
      id: 'ann-1',
      type: 'rect' as const,
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      color: '#ff0000',
      lineWidth: 2,
      fontSize: 16,
      text: '',
      peerId: 'peer-1',
      timestamp: 1
    }

    const ann2 = {
      ...ann1,
      id: 'ann-2',
      x: 99
    }

    act(() => {
      store.addAnnotation(ann1)
      store.addAnnotation(ann2)
      store.removeAnnotation('ann-1')
    })

    expect(store.annotations).toHaveLength(1)
    expect(store.annotations[0].id).toBe('ann-2')
  })

  it('clearAnnotations empties the array', () => {
    let store: ReturnType<typeof useStore> = null!

    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )

    const ann = {
      id: 'ann-1',
      type: 'rect' as const,
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      color: '#ff0000',
      lineWidth: 2,
      fontSize: 16,
      text: '',
      peerId: 'peer-1',
      timestamp: 1
    }

    act(() => {
      store.addAnnotation(ann)
      store.addAnnotation({ ...ann, id: 'ann-2' })
      store.clearAnnotations()
    })

    expect(store.annotations).toHaveLength(0)
  })

  it('reset restores default state after making changes', () => {
    let store: ReturnType<typeof useStore> = null!

    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )

    act(() => {
      store.addPeer({ id: 'peer-1', name: 'Test' })
      store.setPage('meeting')
      store.setError('some error')
      store.reset()
    })

    expect(store.peers).toHaveLength(0)
    expect(store.page).toBe('home')
    expect(store.error).toBeNull()
  })

  it('speakerVolume defaults to 0.5', () => {
    let store: any
    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )
    expect(store.speakerVolume).toBe(0.5)
  })

  it('setSpeakerVolume changes volume', () => {
    let store: any
    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )
    act(() => { store.setSpeakerVolume(0.8) })
    expect(store.speakerVolume).toBe(0.8)
  })

  it('showAudioSettings defaults to false', () => {
    let store: any
    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )
    expect(store.showAudioSettings).toBe(false)
  })

  it('setShowAudioSettings toggles visibility', () => {
    let store: any
    render(
      <StoreProvider>
        <TestConsumer onMount={(s) => { store = s }} />
      </StoreProvider>
    )
    act(() => { store.setShowAudioSettings(true) })
    expect(store.showAudioSettings).toBe(true)
    act(() => { store.setShowAudioSettings(false) })
    expect(store.showAudioSettings).toBe(false)
  })
})
