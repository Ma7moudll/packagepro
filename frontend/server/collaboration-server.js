/**
 * Socket.io Collaboration Server
 * 
 * Run this server separately:
 * node server/collaboration-server.js
 * 
 * Or use PM2:
 * pm2 start server/collaboration-server.js --name collaboration
 */

const { Server } = require("socket.io")
const http = require("http")

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
  },
})

// Store rooms and users
const rooms = new Map()

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // Extract auth data
  const { roomId, userId, userName, userEmail } = socket.handshake.auth || {}

  if (!roomId || !userId) {
    socket.disconnect()
    return
  }

  socket.data = { roomId, userId, userName, userEmail }

  // Join room
  socket.join(roomId)

  // Initialize room if needed
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      users: new Map(),
    })
  }

  const room = rooms.get(roomId)
  const user = {
    id: userId,
    name: userName,
    email: userEmail,
    socketId: socket.id,
  }

  room.users.set(userId, user)

  // Notify others
  socket.to(roomId).emit("user_joined", { user })

  // Send current users to new user
  socket.emit("room_users", {
    users: Array.from(room.users.values()),
  })

  // Presence update
  socket.on("presence_update", ({ roomId: rId, presence }) => {
    if (rId !== roomId) return
    socket.to(roomId).emit("presence_update", {
      userId,
      presence,
    })
  })

  // Chat message
  socket.on("chat_message", ({ roomId: rId, content }) => {
    if (rId !== roomId) return

    const message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      userId,
      userName,
      content,
      timestamp: Date.now(),
      type: "message",
    }

    io.to(roomId).emit("chat_message", { message })
  })

  // Comment add
  socket.on("comment_add", ({ roomId: rId, comment }) => {
    if (rId !== roomId) return

    const newComment = {
      ...comment,
      id: `comment-${Date.now()}-${Math.random()}`,
      userId,
      userName,
      timestamp: Date.now(),
      resolved: false,
    }

    io.to(roomId).emit("comment_added", { comment: newComment })
  })

  // Comment resolve
  socket.on("comment_resolve", ({ roomId: rId, commentId }) => {
    if (rId !== roomId) return
    io.to(roomId).emit("comment_resolved", { commentId })
  })

  // Layer update
  socket.on("layer_update", ({ roomId: rId, layerId, updates }) => {
    if (rId !== roomId) return
    socket.to(roomId).emit("layer_updated", {
      userId,
      layerId,
      updates,
    })
  })

  // Permission request
  socket.on("permission_request", ({ roomId: rId, userId: targetUserId, permission }) => {
    if (rId !== roomId) return
    // Only room owner can change permissions
    // TODO: Implement permission logic
    io.to(roomId).emit("permission_changed", {
      userId: targetUserId,
      permission,
    })
  })

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)

    if (room && room.users.has(userId)) {
      room.users.delete(userId)

      socket.to(roomId).emit("user_left", { userId })

      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(roomId)
      }
    }
  })
})

const PORT = process.env.PORT || 3002
server.listen(PORT, () => {
  console.log(`Collaboration server running on port ${PORT}`)
})

