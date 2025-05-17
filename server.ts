import { createServer } from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"

dotenv.config()
const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

interface DirectMessage {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
}

//inbuilt connection
io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId as string
  const serverId = socket.handshake.query.serverId as string

  if (userId) {
    socket.join(`user:${userId}`)
  }

  if (serverId) {
    socket.join(`server:${serverId}`)
  }

  // Handle direct messages
  socket.on("directMessage", (message: DirectMessage) => {
    io.to(`user:${message.receiverId}`).emit("directMessage", message)
  })

  // Handle channel joining
  socket.on("join-channel", (channelId: string) => {
    socket.join(`channel:${channelId}`)
    console.log(`User ${userId} joined channel ${channelId}`)
  })

  // Handle channel leaving
  socket.on("leave-channel", (channelId: string) => {
    socket.leave(`channel:${channelId}`)
    console.log(`User ${userId} left channel ${channelId}`)
  })

  // Handle typing start
  socket.on("typing-start", (data: { channelId: string, user: { id: string, name: string } }) => {
    socket.to(`channel:${data.channelId}`).emit("user-typing", {
      userId: data.user.id,
      username: data.user.name
    })
  })

  // Handle typing stop
  socket.on("typing-stop", (data: { channelId: string, userId: string }) => {
    socket.to(`channel:${data.channelId}`).emit("user-stopped-typing", {
      userId: data.userId
    })
  })

  // Handle channel messages
  socket.on("send-message", async (data: { 
    channelId: string, 
    content: string,
    user: {
      id: string,
      name: string,
      image: string | null
    },
    messageId: string
  }) => {
    console.log("Received message:", data)
    const message = {
      id: data.messageId,
      content: data.content,
      channelId: data.channelId,
      userId: data.user.id,
      user: data.user,
      createdAt: new Date().toISOString()
    }
    
    io.to(`channel:${data.channelId}`).emit("new-message", message)
    console.log(`Broadcasting message to channel ${data.channelId}`)
  })

  socket.on("disconnect", async () => {
    if (userId) {
      console.log(`User ${userId} disconnected`)

      
    }
  })
})

const PORT = process.env.SOCKET_PORT || 5000

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
}) 