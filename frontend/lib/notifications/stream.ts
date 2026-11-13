import type { AppNotification } from '@shared/types'

interface SSEEvent {
  type: string
  data?: string
}

export function parseSSE(raw: string): SSEEvent {
  let type = 'message'
  const dataLines: string[] = []

  for (const line of raw.split('\n')) {
    if (line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      type = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) return { type }
  return { type, data: dataLines.join('\n') }
}

interface SubscriptionHandlers {
  onNotification: (notification: AppNotification) => void
  onSnapshot: (snapshot: { unread: number }) => void
  onStatusChange?: (status: 'connected' | 'reconnecting' | 'disconnected') => void
}

export function subscribeToNotifications(baseUrl: string, handlers: SubscriptionHandlers): () => void {
  let closed = false
  let controller: AbortController | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0

  const connect = async () => {
    if (closed) return

    const token = localStorage.getItem('accessToken')
    if (!token) {
      handlers.onStatusChange?.('disconnected')
      return
    }

    controller = new AbortController()

    try {
      const res = await fetch(`${baseUrl}/notifications/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })

      if (!res.ok) {
        if (res.status === 401) {
          handlers.onStatusChange?.('disconnected')
          return
        }
        throw new Error(String(res.status))
      }

      if (!res.body) throw new Error('Response body unavailable')

      attempt = 0
      handlers.onStatusChange?.('connected')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx: number
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const event = parseSSE(raw)

          if (event.type === 'notification' && event.data) {
            try {
              handlers.onNotification(JSON.parse(event.data) as AppNotification)
            } catch {
              // ignore malformed payloads
            }
          } else if (event.type === 'snapshot' && event.data) {
            try {
              handlers.onSnapshot(JSON.parse(event.data) as { unread: number })
            } catch {
              // ignore malformed payloads
            }
          }
        }
      }
    } catch (error) {
      if (closed) return
      if (error instanceof DOMException && error.name === 'AbortError') return
    }

    if (closed) return

    attempt += 1
    const delay = Math.min(1000 * 2 ** Math.min(attempt - 1, 5), 30000)
    handlers.onStatusChange?.('reconnecting')
    retryTimer = setTimeout(connect, delay)
  }

  connect()

  return () => {
    closed = true
    if (retryTimer) clearTimeout(retryTimer)
    controller?.abort()
  }
}