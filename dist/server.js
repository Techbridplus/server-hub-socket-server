"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const httpServer = (0, http_1.createServer)();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
//inbuilt connection
io.on("connection", async (socket) => {
    const userId = socket.handshake.query.userId;
    const serverId = socket.handshake.query.serverId;
    if (userId) {
        socket.join(`user:${userId}`);
    }
    if (serverId) {
        socket.join(`server:${serverId}`);
    }
    // Handle direct messages
    socket.on("directMessage", (message) => {
        io.to(`user:${message.receiverId}`).emit("directMessage", message);
    });
    // Handle channel joining
    socket.on("join-channel", (channelId) => {
        socket.join(`channel:${channelId}`);
        console.log(`User ${userId} joined channel ${channelId}`);
    });
    // Handle channel leaving
    socket.on("leave-channel", (channelId) => {
        socket.leave(`channel:${channelId}`);
        console.log(`User ${userId} left channel ${channelId}`);
    });
    // Handle typing start
    socket.on("typing-start", (data) => {
        socket.to(`channel:${data.channelId}`).emit("user-typing", {
            userId: data.user.id,
            username: data.user.name
        });
    });
    // Handle typing stop
    socket.on("typing-stop", (data) => {
        socket.to(`channel:${data.channelId}`).emit("user-stopped-typing", {
            userId: data.userId
        });
    });
    // Handle channel messages
    socket.on("send-message", async (data) => {
        console.log("Received message:", data);
        const message = {
            id: data.messageId,
            content: data.content,
            channelId: data.channelId,
            userId: data.user.id,
            user: data.user,
            createdAt: new Date().toISOString()
        };
        io.to(`channel:${data.channelId}`).emit("new-message", message);
        console.log(`Broadcasting message to channel ${data.channelId}`);
    });
    socket.on("disconnect", async () => {
        if (userId) {
            console.log(`User ${userId} disconnected`);
        }
    });
});
const PORT = process.env.SOCKET_PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Socket.io server running on port ${PORT}`);
});
