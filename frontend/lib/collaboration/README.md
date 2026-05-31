# Collaboration System

This directory contains the collaboration system for real-time multi-user editing.

## Features

### ✅ WebSocket Server (Socket.io)
- Real-time communication
- Room-based collaboration
- Presence updates
- Event broadcasting

### ✅ Presence Indicators
- Live cursors showing other users' positions
- User avatars with colors
- Online user count
- Real-time presence updates

### ✅ Multi-User Editing
- Yjs integration for CRDT-based conflict resolution
- Real-time layer updates
- Synchronized state across users
- Optimistic updates

### ✅ Conflict Resolution (OT/CRDT)
- Yjs for CRDT (Conflict-free Replicated Data Type)
- Automatic conflict resolution
- Operational Transform ready
- Shared state synchronization

### ✅ Chat/Comments System
- Real-time chat messages
- Comments on design elements
- Comment resolution
- Threaded comments support

### ✅ User Permissions
- View-only permission
- Edit permission
- Owner permission
- Permission management

## Architecture

### Socket.io Client
- `socket-client.ts`: Socket.io client wrapper
- Handles connection, events, and presence
- Room-based messaging

### Yjs Provider
- `yjs-provider.ts`: Yjs WebSocket provider
- CRDT-based conflict resolution
- Shared state synchronization
- Awareness (presence) system

### Collaboration Store
- `collaboration-store.ts`: Zustand store for collaboration state
- User management
- Messages and comments
- Permission handling

## Components

### LiveCursors
- Displays live cursors of other users
- Position tracking
- User identification

### PresenceIndicator
- Shows online users
- User avatars
- User count

### CollaborationChat
- Real-time chat interface
- Message history
- Message sending

### CommentsPanel
- Design comments
- Comment resolution
- Comment threads

### CollaborationProvider
- Main provider component
- Handles connection
- Tracks cursor movement
- Integrates all collaboration features

## Usage

### Setup Collaboration

```typescript
import { CollaborationProvider } from "@/components/collaboration/CollaborationProvider"

<CollaborationProvider canvasRef={canvasRef} faceId="front">
  <YourEditor />
</CollaborationProvider>
```

### Connect to Room

```typescript
import { useCollaborationStore } from "@/lib/collaboration/collaboration-store"

const connect = useCollaborationStore((s) => s.connect)

connect(roomId, userId, userName, userEmail)
```

### Update Presence

```typescript
const updatePresence = useCollaborationStore((s) => s.updatePresence)

updatePresence({
  userId: "user123",
  cursor: { x: 100, y: 200, faceId: "front" },
  selection: ["layer1", "layer2"],
})
```

### Send Message

```typescript
const sendMessage = useCollaborationStore((s) => s.sendMessage)

sendMessage("Hello team!")
```

### Add Comment

```typescript
const addComment = useCollaborationStore((s) => s.addComment)

addComment({
  content: "This needs adjustment",
  position: { x: 150, y: 200 },
  faceId: "front",
  layerId: "layer1",
})
```

## Server Setup

### Socket.io Server

Create a Socket.io server (separate from Next.js):

```typescript
import { Server } from "socket.io"

const io = new Server(3002, {
  cors: {
    origin: "http://localhost:3001",
  },
})

io.on("connection", (socket) => {
  socket.on("join_room", (roomId) => {
    socket.join(roomId)
    socket.to(roomId).emit("user_joined", { user: socket.data.user })
  })

  socket.on("presence_update", ({ roomId, presence }) => {
    socket.to(roomId).emit("presence_update", {
      userId: socket.data.userId,
      presence,
    })
  })

  // ... other events
})
```

### Yjs WebSocket Server

Use `y-websocket` server or create custom:

```typescript
import { WebSocketServer } from "ws"
import * as Y from "yjs"

const wss = new WebSocketServer({ port: 1234 })

wss.on("connection", (ws) => {
  // Handle Yjs protocol
})
```

## Environment Variables

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
NEXT_PUBLIC_YJS_WS_URL=ws://localhost:1234
```

## Notes

- Socket.io server needs to be set up separately
- Yjs WebSocket server needs to be configured
- Current implementation uses mock data
- In production, use proper authentication and authorization
- Consider rate limiting for presence updates
- Optimize cursor updates (throttle/debounce)

