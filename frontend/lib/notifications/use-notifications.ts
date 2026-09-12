'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE } from '@/lib/api/client'
import { notifApi } from '@/lib/api/notifications'
import { subscribeToNotifications } from '@/lib/notifications/stream'
import type { AppNotification } from '@shared/types'

export function useNotifications(limit = 20) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const subscribedRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const res = await notifApi.list(limit)
      setNotifications(res.data.data)
      setTotal(res.data.total)
      setUnread(res.data.unread)
    } catch {
      // ignore polling failures; SSE retries independently
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    if (subscribedRef.current) return
    subscribedRef.current = true

    refresh()

    const unsubscribe = subscribeToNotifications(API_BASE, {
      onNotification: (notification) => {
        setNotifications((prev) => [notification, ...prev])
        setUnread((prev) => prev + 1)
        setTotal((prev) => prev + 1)
      },
      onSnapshot: ({ unread: snapshotUnread }) => setUnread(snapshotUnread),
      onStatusChange: (status) => setConnected(status === 'connected'),
    })

    return unsubscribe
  }, [refresh])

  const markAsRead = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id)
      if (!target || target.read) return

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnread((prev) => Math.max(prev - 1, 0))

      try {
        await notifApi.markAsRead(id)
      } catch {
        refresh()
      }
    },
    [notifications, refresh],
  )

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)

    try {
      await notifApi.markAllAsRead()
    } catch {
      refresh()
    }
  }, [refresh])

  return { notifications, unread, total, loading, connected, refresh, markAsRead, markAllAsRead }
}