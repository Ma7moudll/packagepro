import type { LucideIcon } from 'lucide-react'
import {
  PackagePlus,
  ClipboardCheck,
  Factory,
  Truck,
  PackageCheck,
  Star,
  Handshake,
  CheckCircle2,
  Wallet,
} from 'lucide-react'
import type { NotificationType } from '@shared/types'

interface NotificationMeta {
  icon: LucideIcon
  bg: string
  text: string
  labelEn: string
  labelAr: string
}

const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
  order_created: {
    icon: PackagePlus,
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    labelEn: 'Order created',
    labelAr: 'تم إنشاء الطلب',
  },
  approval_required: {
    icon: ClipboardCheck,
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    labelEn: 'Approval required',
    labelAr: 'مطلوب موافقتك',
  },
  production_started: {
    icon: Factory,
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    labelEn: 'Production started',
    labelAr: 'بدأ الإنتاج',
  },
  shipment_created: {
    icon: Truck,
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    labelEn: 'Order shipped',
    labelAr: 'تم شحن الطلب',
  },
  delivery_confirmed: {
    icon: PackageCheck,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    labelEn: 'Order delivered',
    labelAr: 'تم التسليم',
  },
  review_requested: {
    icon: Star,
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    labelEn: 'Review requested',
    labelAr: 'طلب تقييم',
  },
  handshake_requested: {
    icon: Handshake,
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    labelEn: 'Partnership offer',
    labelAr: 'عرض شراكة',
  },
  payment_received: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    labelEn: 'Payment received',
    labelAr: 'تم استلام الدفعة',
  },
  settlement_completed: {
    icon: Wallet,
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    labelEn: 'Settlement completed',
    labelAr: 'اكتملت التسوية',
  },
}

export function getNotificationMeta(type: NotificationType): NotificationMeta {
  return NOTIFICATION_META[type] ?? NOTIFICATION_META.order_created
}

export function formatNotificationTime(iso: string, language: 'en' | 'ar'): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const locale = language === 'ar' ? 'ar' : 'en'
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return rtf.format(0, 'minute')
  if (minutes < 60) return rtf.format(-minutes, 'minute')

  const hours = Math.round(minutes / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')

  const days = Math.round(hours / 24)
  if (days < 7) return rtf.format(-days, 'day')

  const weeks = Math.round(days / 7)
  if (weeks < 5) return rtf.format(-weeks, 'week')

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))
}