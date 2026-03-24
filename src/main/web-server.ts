// src/main/web-server.ts
import { createServer, IncomingMessage, ServerResponse, request as httpRequest } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { WebSocketServer, WebSocket } from 'ws'
import { URL } from 'node:url'
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
  private devProxyUrl: string | null = null

  start(port: number, staticDir: string, devProxyUrl?: string): void {
    this.devProxyUrl = devProxyUrl ?? null

    this.httpServer = createServer((req, res) => {
      if (this.devProxyUrl) {
        this._proxyHttp(req, res, this.devProxyUrl)
      } else {
        this._serveStatic(req, res, staticDir)
      }
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
      } else if (this.devProxyUrl) {
        this._proxyWsUpgrade(req, socket as net.Socket, this.devProxyUrl)
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

  private _proxyHttp(req: IncomingMessage, res: ServerResponse, targetBase: string): void {
    const target = new URL(req.url ?? '/', targetBase)
    const proxyReq = httpRequest({
      hostname: target.hostname,
      port: target.port || 80,
      path: target.pathname + target.search,
      method: req.method,
      headers: req.headers,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers)
      proxyRes.pipe(res)
    })

    proxyReq.on('error', () => {
      res.writeHead(502)
      res.end('Bad Gateway')
    })

    req.pipe(proxyReq)
  }

  private _proxyWsUpgrade(req: IncomingMessage, socket: net.Socket, targetBase: string): void {
    const target = new URL(req.url ?? '/', targetBase)
    const proxyReq = httpRequest({
      hostname: target.hostname,
      port: target.port || 80,
      path: target.pathname + target.search,
      method: 'GET',
      headers: { ...req.headers, host: `${target.hostname}:${target.port}` },
    })

    proxyReq.on('upgrade', (_proxyRes, proxySocket, proxyHead) => {
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n')
      if (proxyHead.length > 0) socket.unshift(proxyHead)
      proxySocket.pipe(socket)
      socket.pipe(proxySocket)
      socket.on('error', () => proxySocket.destroy())
      proxySocket.on('error', () => socket.destroy())
    })

    proxyReq.on('error', () => socket.destroy())
    proxyReq.end()
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
