export const selfId = 'mock-self-id'

export function joinRoom(_config: unknown, _namespace: string) {
  return {
    onPeerJoin: () => {},
    onPeerLeave: () => {},
    onPeerStream: () => {},
    makeAction: () => [() => Promise.resolve(), () => {}],
    addStream: () => {},
    removeStream: () => {},
    leave: () => Promise.resolve(),
    getPeers: () => ({})
  }
}
