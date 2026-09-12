'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/providers/language-provider'
import { cn } from '@/lib/utils'
import { getNotificationMeta, formatNotificationTime } from './notification-meta'
import type { AppNotification } from '@shared/types'

interface NotificationItemProps {
  notification: AppNotification
  onOpen?: (id: string) => void
  compact?: boolean
}

export function NotificationItem({ notification, onOpen, compact = false }: NotificationItemProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const meta = getNotificationMeta(notification.type)

  const handleClick = () => {
    onOpen?.(notification.id)
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const Icon = meta.icon

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50',
        !notification.read && 'bg-emerald-50/50 hover:bg-emerald-50',
        language === 'ar' && 'text-right',
      )}
    >
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.bg)}>
        <Icon className={cn('h-4 w-4', meta.text)} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900">
          {language === 'ar' ? meta.labelAr : meta.labelEn}
        </span>
        <span className="mt-0.5 block truncate text-xs text-gray-500">{notification.message}</span>
        <span className="mt-0.5 block text-[11px] text-gray-400">
          {formatNotificationTime(notification.createdAt, language)}
        </span>
      </span>

      {!notification.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
    </button>
  )
}