interface Window {
  api: {
    send:   (channel: string, data: unknown) => void
    invoke: (channel: string, data?: unknown) => Promise<unknown>
    on:     (channel: string, cb: (data: unknown) => void) => () => void
  }
}
