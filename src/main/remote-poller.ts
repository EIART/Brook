import { EventEmitter } from 'node:events'
import { WebSocketServer, WebSocket } from 'ws'
import type { PlaybackStatus, TrackInfo } from '../shared/types'

interface ProbeMessage {
  type: 'playback:update'
  payload: PlaybackStatus
}

export class RemotePoller extends EventEmitter {
  private server: WebSocketServer | null = null
  private lastTrackTitle: string | null = null

  constructor(private readonly port: number = 9898) {
    super()
  }

  start(): void {
    this.server = new WebSocketServer({ port: this.port })

    this.server.on('listening', () => {
      console.log(`[RemotePoller] WebSocket server listening on port ${this.port}`)
    })

    this.server.on('connection', (socket: WebSocket, req: { socket: { remoteAddress?: string } }) => {
      const clientIp = req.socket.remoteAddress ?? 'unknown'
      console.log(`[RemotePoller] Probe connected from ${clientIp}`)

      socket.on('message', (data) => {
        try {
          const msg: ProbeMessage = JSON.parse(data.toString())
          if (msg.type !== 'playback:update') return

          const status = msg.payload
          this.emit('playback:update', status)

          const title = status.track?.title ?? null
          if (title !== this.lastTrackTitle) {
            this.lastTrackTitle = title
            if (status.track) {
              this.emit('track:changed', status.track satisfies TrackInfo)
            }
          }
        } catch {
          // ignore malformed messages
        }
      })

      socket.on('close', () => {
        console.log(`[RemotePoller] Probe disconnected from ${clientIp}`)
      })
    })

    this.server.on('error', (err) => {
      console.error(`[RemotePoller] Server error: ${err.message}`)
    })
  }

  stop(): void {
    this.server?.close()
    this.server = null
  }
}
