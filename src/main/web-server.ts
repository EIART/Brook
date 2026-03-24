// src/main/web-server.ts
import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { WebSocketServer, WebSocket } from 'ws'
import * as net from 'node:net'

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
}

const DATA_WS_PATH = '/brook-ws'

export class WebBroadcastServer {
  private wss: WebSocketServer | null = null
  private httpServer: ReturnType<typeof createServer> | null = null
  private readonly clients = new Set<WebSocket>()
  private readonly invokeHandlers = new Map<string, (data: unknown) => Promise<unknown>>()

  start(port: number, staticDir: string): void {
    this.httpServer = createServer((req, res) => {
      this._serveStatic(req, res, staticDir)
    })

    // noServer: we handle the upgrade event manually for path-based routing
    this.wss = new WebSocketServer({ noServer: true })
    this.wss.on('connection', (ws) => {
      this.clients.add(ws)
      ws.on('close', () => this.clients.delete(ws))
      ws.on('message', (raw) => this._handleMessage(ws, raw.toString()))
    })

    this.httpServer.on('upgrade', (req, socket, head) => {
      const pathname = new URL(req.url ?? '/', `http://localhost`).pathname
      if (pathname === DATA_WS_PATH) {
        this.wss!.handleUpgrade(req, socket as net.Socket, head, (ws) => {
          this.wss!.emit('connection', ws, req)
        })
      } else {
        (socket as net.Socket).destroy()
      }
    })

    this.httpServer.listen(port, '0.0.0.0', () => {
      console.log(`[web] http://localhost:${port}`)
    })
  }

  stop(): void {
    this.wss?.close()
    this.httpServer?.close()
    this.wss = null
    this.httpServer = null
    this.clients.clear()
  }

  broadcast(channel: string, data: unknown): void {
    const msg = JSON.stringify({ type: 'push', channel, data })
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg)
    }
  }

  onInvoke(channel: string, handler: (data: unknown) => Promise<unknown>): void {
    this.invokeHandlers.set(channel, handler)
  }

  private async _handleMessage(ws: WebSocket, raw: string): Promise<void> {
    let msg: { type: string; id: string; channel: string; data: unknown }
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (msg.type !== 'invoke') return

    const handler = this.invokeHandlers.get(msg.channel)
    if (!handler) {
      ws.send(JSON.stringify({ type: 'response', id: msg.id, result: null }))
      return
    }

    try {
      const result = await handler(msg.data)
      ws.send(JSON.stringify({ type: 'response', id: msg.id, result: result ?? null }))
    } catch (err) {
      ws.send(JSON.stringify({ type: 'response', id: msg.id, result: null, error: String(err) }))
    }
  }

  private async _serveStatic(req: IncomingMessage, res: ServerResponse, staticDir: string): Promise<void> {
    let pathname = new URL(req.url ?? '/', `http://localhost`).pathname
    if (pathname === '/') pathname = '/index.html'

    const filePath = join(staticDir, pathname)
    const ext = extname(filePath)

    try {
      const content = await readFile(filePath)
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
      res.end(content)
    } catch {
      // SPA fallback — serve index.html for unknown paths
      try {
        const content = await readFile(join(staticDir, 'index.html'))
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(content)
      } catch {
        res.writeHead(404)
        res.end('Not found')
      }
    }
  }
}
