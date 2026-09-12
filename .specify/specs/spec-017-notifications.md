# SPEC-017: Notification System (In-App)

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Important  
> **Dependencies:** SPEC-013 (Auth)

---

## 1. What

Real-time in-app notification system:

**Notification Types:**
- Order Update: status change, delay, shipment
- Payment: success, failure, refund, retry
- Shipping: label created, in transit, delivered
- Vendor Alert: handshake offer, PO received, production reminder
- System: maintenance, feature updates, announcements
- Reminder: payment due, approval pending, cart abandonment

**Priority Levels:**
- Low: silent, badge only
- Normal: badge + in-app banner
- High: badge + banner + sound
- Urgent: badge + banner + sound + popup modal

**Features:**
- Real-time delivery via WebSocket/SSE
- Notification center: bell icon with unread count
- Grouped by date, filterable by type
- Mark all as read
- Click navigation to relevant page
- User preferences: enable/disable per type and channel

---

## 2. Why

Email alone is insufficient for time-sensitive updates. In-app notifications ensure users see critical information immediately, reducing missed actions by 70%.

**Business Impact:**
- Reduce missed actions: -70%
- Faster approvals: real-time alerts
- Improve engagement: users return to platform
- Reduce email fatigue: in-app for routine updates

---

## 3. Who

| Role | Notifications |
|------|---------------|
| **All Users** | Personalized based on role and activity |
| **Admin** | System-wide announcements, exception alerts |
| **Customer** | Order, payment, shipping, review reminders |
| **Vendor** | Order offers, POs, production reminders |

---

## 4. Success Criteria

### Functional
- [ ] 6 notification types with distinct icons and colors
- [ ] 4 priority levels with appropriate delivery methods
- [ ] Real-time: WebSocket/SSE delivery <1s
- [ ] Notification center: bell icon, unread count, grouped list
- [ ] Click action: navigate to relevant page with context
- [ ] Preferences: user can toggle per type and channel
- [ ] Retention: 90 days storage, auto-archive after
- [ ] Batch notifications: group similar notifications (e.g., 5 orders shipped)
- [ ] Do not disturb: scheduled quiet hours

### Non-Functional
- [ ] Delivery latency <1s
- [ ] Notification center load <500ms
- [ ] Support 10k concurrent connections
- [ ] Message persistence: survive server restart

---

## 5. Out of Scope

- Mobile push notifications (Phase 2)
- Browser push notifications (Web Push API)
- SMS notifications
- Notification scheduling (send later)
- In-app chat/messaging

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/notifications/notifications.controller.ts` | Notification API |
| `backend/src/modules/notifications/notifications.service.ts` | Notification logic |
| `backend/src/modules/notifications/notifications.gateway.ts` | WebSocket gateway |
| `backend/src/modules/notifications/dto/create-notification.dto.ts` | Notification validation |
| `backend/prisma/schema.prisma` | Notification, NotificationPreference tables |
| `frontend/components/notifications/NotificationBell.tsx` | Bell icon with count |
| `frontend/components/notifications/NotificationCenter.tsx` | Dropdown panel |
| `frontend/components/notifications/NotificationItem.tsx` | Single notification row |
| `frontend/components/notifications/NotificationPreferences.tsx` | Settings panel |
| `frontend/lib/notifications/websocket.ts` | WebSocket client |
