'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/providers/language-provider'
import { useNotifications } from '@/lib/notifications/use-notifications'
import { NotificationItem } from './notification-item'

export function NotificationBell() {
  const { language } = useLanguage()
  const router = useRouter()
  const { notifications, unread, loading, markAsRead, markAllAsRead } = useNotifications(10)
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-500 hover:text-gray-900"
          aria-label={language === 'ar' ? 'الإشعارات' : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-medium text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">
            {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            {unread > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({unread})</span>}
          </p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-600" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              {language === 'ar' ? 'قراءة الكل' : 'Mark all read'}
            </Button>
          )}
        </div>

        <ScrollArea className='h-80'>
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
              <Bell className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                {language === 'ar' ? 'لا توجد إشعارات بعد' : "You're all caught up"}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {(notifications ?? []).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={markAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-gray-100 p-2">
          <Button
            variant="ghost"
            className="w-full text-sm text-gray-600"
            onClick={() => {
              setOpen(false)
              router.push('/notifications')
            }}
          >
            {language === 'ar' ? 'عرض كل الإشعارات' : 'View all notifications'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}