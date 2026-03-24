// src/renderer/src/api-adapter.ts
// Provides a unified api object regardless of whether running inside Electron or a browser.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any

interface Api {
  invoke(channel: string, data?: any): Promise<any>
  on(channel: string, cb: AnyFn): () => void
  send(channel: string, data: any): void
}

function createElectronApi(): Api {
  return (window as any).api as Api
}

function createWebSocketApi(wsUrl: string): Api {
  const ws = new WebSocket(wsUrl)
  const listeners = new Map<string, Set<AnyFn>>()
  const pending = new Map<string, (result: any) => void>()

  ws.onmessage = (e: MessageEvent) => {
    let msg: { type: string; channel?: string; data?: any; id?: string; result?: any }
    try { msg = JSON.parse(e.data as string) } catch { return }

    if (msg.type === 'push' && msg.channel) {
      listeners.get(msg.channel)?.forEach(cb => cb(msg.data))
    } else if (msg.type === 'response' && msg.id) {
      pending.get(msg.id)?.(msg.result)
      pending.delete(msg.id)
    }
  }

  return {
    invoke(channel, data?) {
      return new Promise((resolve) => {
        const id = crypto.randomUUID()
        pending.set(id, resolve)
        const send = () => ws.send(JSON.stringify({ type: 'invoke', id, channel, data }))
        if (ws.readyState === WebSocket.OPEN) {
          send()
        } else {
          ws.addEventListener('open', send, { once: true })
        }
      })
    },
    on(channel: string, cb: AnyFn) {
      if (!listeners.has(channel)) listeners.set(channel, new Set())
      listeners.get(channel)!.add(cb)
      return () => listeners.get(channel)?.delete(cb)
    },
    send() {},
  }
}

export function createApi(): Api {
  if (typeof (window as any).api !== 'undefined') {
    return createElectronApi()
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${wsProtocol}//${window.location.host}/brook-ws`
  return createWebSocketApi(wsUrl)
}
