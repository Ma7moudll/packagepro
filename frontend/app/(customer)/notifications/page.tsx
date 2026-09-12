'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/providers/language-provider'
import { useAuth } from '@/providers/auth-provider'
import { useNotifications } from '@/lib/notifications/use-notifications'
import { NotificationItem } from '@/components/notifications/notification-item'

export default function NotificationsPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { notifications, unread, loading, markAsRead, markAllAsRead } = useNotifications(50)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/notifications')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{language === 'ar' ? 'الإشعارات' : 'Notifications'}</CardTitle>
          {unread > 0 && (
            <Button variant="outline" size="sm" className="gap-1 text-emerald-600" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4" />
              {language === 'ar' ? 'قراءة الكل' : 'Mark all read'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Bell className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                {language === 'ar' ? 'لا توجد إشعارات بعد' : "You're all caught up"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onOpen={markAsRead} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}