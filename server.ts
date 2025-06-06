import { createServer } from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"

dotenv.config()

// Create HTTP server with a basic response so Render can detect an open port
const httpServer = createServer((req, res) => {
  res.writeHead(200)
  res.end("Socket.io server is up and running!")
})

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "https://server-hub-optimised.vercel.app/",
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

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId as string
  const serverId = socket.handshake.query.serverId as string

  if (userId) {
    socket.join(`user:${userId}`)
  }

  if (serverId) {
    socket.join(`server:${serverId}`)
  }

  socket.on("directMessage", (message: DirectMessage) => {
    io.to(`user:${message.receiverId}`).emit("directMessage", message)
  })

  socket.on("join-channel", (channelId: string) => {
    socket.join(`channel:${channelId}`)
    console.log(`User ${userId} joined channel ${channelId}`)
  })

  socket.on("leave-channel", (channelId: string) => {
    socket.leave(`channel:${channelId}`)
    console.log(`User ${userId} left channel ${channelId}`)
  })

  socket.on("typing-start", (data: { channelId: string, user: { id: string, name: string } }) => {
    socket.to(`channel:${data.channelId}`).emit("user-typing", {
      userId: data.user.id,
      username: data.user.name
    })
  })

  socket.on("typing-stop", (data: { channelId: string, userId: string }) => {
    socket.to(`channel:${data.channelId}`).emit("user-stopped-typing", {
      userId: data.userId
    })
  })

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

// Use PORT from environment, required by Render
const PORT = process.env.PORT || 5000

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
})
